import { Request, Response, NextFunction, Router } from "express";
import { AuthService } from "../services/authService";
import { registerSchema, loginSchema, updateProfileSchema } from "../utils/validators";
import { authenticate, AuthRequest } from "../middleware/auth";
import { BadRequestError, UnauthorizedError, NotFoundError } from "../utils/errors";
import { EmailService } from "../services/emailService";
import { config } from "../config";
import { prisma } from "../utils/prisma";
import { issueChallenge } from "../utils/walletChallenge";

const router = Router();

// ── Refresh-token cookie (HttpOnly → not readable by JS, unlike localStorage) ──
// Frontend (www.ashnance.com) and API (api.ashnance.com) are different origins but
// the same site, so cross-origin fetches need SameSite=None; Secure in production.
const REFRESH_COOKIE = "ash_rt";
function refreshCookieOpts() {
  const isProd = config.nodeEnv === "production";
  return {
    httpOnly: true,
    secure: isProd, // SameSite=None requires Secure
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    path: "/api/auth", // only sent to auth endpoints
  };
}
function setRefreshCookie(res: Response, token?: string) {
  if (!token) return;
  res.cookie(REFRESH_COOKIE, token, { ...refreshCookieOpts(), maxAge: 7 * 24 * 60 * 60 * 1000 });
}
function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOpts());
}

// POST /api/auth/send-otp — send OTP to email for registration or login
router.post("/send-otp", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") throw new BadRequestError("Email required");
    await EmailService.sendOtp(email.toLowerCase().trim());
    res.json({ success: true, message: "OTP sent to email" });
  } catch (error) { next(error); }
});

// POST /api/auth/verify-otp — verify OTP (returns token for passwordless login if user exists)
router.post("/verify-otp", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) throw new BadRequestError("Email and OTP required");
    const valid = await EmailService.verifyOtp(email.toLowerCase().trim(), otp.toString().trim());
    if (!valid) throw new UnauthorizedError("Invalid or expired OTP");
    res.json({ success: true, message: "OTP verified" });
  } catch (error) { next(error); }
});

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Support OTP-based registration (no password required)
    if (req.body.otp && !req.body.password) {
      const { email, username, otp, referralCode } = req.body;
      if (!email || !username || !otp) throw new BadRequestError("Email, username, and OTP required");
      const valid = await EmailService.verifyOtp(email.toLowerCase().trim(), otp.toString().trim());
      if (!valid) throw new UnauthorizedError("Invalid or expired OTP");
      const result = await AuthService.register({ email: email.toLowerCase().trim(), username, referralCode });
      setRefreshCookie(res, result.refreshToken);
      return res.status(201).json({ success: true, data: result });
    }
    const data = registerSchema.parse(req.body);
    const result = await AuthService.register(data);

    setRefreshCookie(res, result.refreshToken);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return next(new BadRequestError(error.errors[0].message));
    }
    next(error);
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // OTP-based login (passwordless)
    if (req.body.otp && !req.body.password) {
      const { email, otp } = req.body;
      if (!email || !otp) throw new BadRequestError("Email and OTP required");
      const valid = await EmailService.verifyOtp(email.toLowerCase().trim(), otp.toString().trim());
      if (!valid) throw new UnauthorizedError("Invalid or expired OTP");
      const result = await AuthService.loginByEmail(email.toLowerCase().trim());
      setRefreshCookie(res, result.refreshToken);
      return res.json({ success: true, data: result });
    }
    const data = loginSchema.parse(req.body);
    if (!data.password) {
      throw new BadRequestError("Password is required for email login");
    }
    const twoFaCode = req.body.twoFaCode as string | undefined;

    let result;
    try {
      result = await AuthService.login(data.email, data.password, twoFaCode);
    } catch (error: any) {
      // When 2FA is enabled but no code was supplied, tell the frontend to show
      // the 2FA input rather than treating this as a login failure.
      if (error.message === "2FA code required") {
        return res.json({ success: true, data: { requires2fa: true } });
      }
      throw error;
    }

    setRefreshCookie(res, result.refreshToken);
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return next(new BadRequestError(error.errors[0].message));
    }
    next(error);
  }
});

// POST /api/auth/login/recovery — login with backup recovery code instead of TOTP
router.post("/login/recovery", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, recoveryCode } = req.body;
    if (!email || !password || !recoveryCode) {
      throw new BadRequestError("email, password, and recoveryCode are required");
    }
    const result = await AuthService.loginWithRecoveryCode(
      (email as string).toLowerCase().trim(),
      password as string,
      (recoveryCode as string).trim()
    );
    setRefreshCookie(res, result.refreshToken);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Prefer the HttpOnly cookie; fall back to the body for older clients.
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    if (!refreshToken) throw new BadRequestError("Refresh token required");

    const tokens = await AuthService.refreshToken(refreshToken);

    setRefreshCookie(res, tokens.refreshToken);
    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post("/logout", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }
    clearRefreshCookie(res);
    res.json({ success: true, message: "Logged out" });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/profile
router.get("/profile", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await AuthService.getProfile(req.user!.userId);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/profile — Update profile (username, privacy, avatar)
router.put("/profile", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const updated = await AuthService.updateProfile(req.user!.userId, data);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return next(new BadRequestError(error.errors[0].message));
    }
    next(error);
  }
});

// PUT /api/auth/password — Change password
router.put("/password", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new BadRequestError("Both current and new password are required");
    }
    if (newPassword.length < 8) {
      throw new BadRequestError("New password must be at least 8 characters");
    }
    await AuthService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// WALLET AUTH (Phantom / Solflare)
// ============================================================

// POST /api/auth/challenge — issue a single-use nonce for wallet sign-in (anti-replay).
// The client must sign the returned message and submit it to /wallet or /link-wallet.
router.post("/challenge", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey || typeof publicKey !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(publicKey)) {
      throw new BadRequestError("A valid Solana publicKey is required");
    }
    const message = issueChallenge(publicKey);
    res.json({ success: true, data: { message } });
  } catch (error) { next(error); }
});

// POST /api/auth/wallet — verify wallet signature, return JWT (standalone wallet login)
router.post("/wallet", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { publicKey, signature, message } = req.body;
    if (!publicKey || !signature || !message) {
      throw new BadRequestError("publicKey, signature, and message are required");
    }
    const result = await AuthService.loginWithWallet({ publicKey, signature, message });
    setRefreshCookie(res, result.refreshToken);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/apply-referral — apply a referral code after Google OAuth signup
// Must be called before any burns; silently skips if referral is already applied
router.post("/apply-referral", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { referralCode } = req.body;
    if (!referralCode || typeof referralCode !== "string") {
      throw new BadRequestError("referralCode is required");
    }
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredById: true },
    });
    if (!user) throw new NotFoundError("User not found");

    // Already has a referrer — idempotent, just succeed
    if (user.referredById) {
      return res.json({ success: true, data: { message: "Referral already applied" } });
    }

    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
    if (!referrer) throw new NotFoundError("Referral code not found");
    if (referrer.id === userId) throw new BadRequestError("Cannot refer yourself");

    await prisma.$transaction(async (tx: any) => {
      await tx.user.update({ where: { id: userId }, data: { referredById: referrer.id } });
      // Create referral record only if it doesn't already exist
      const existing = await tx.referral.findFirst({
        where: { referrerId: referrer.id, refereeId: userId },
      });
      if (!existing) {
        // Inactive until the referee actually burns (proof of activity) — see burnService.
        await tx.referral.create({ data: { referrerId: referrer.id, refereeId: userId, isActive: false } });
      }
    });

    res.json({ success: true, data: { message: "Referral applied" } });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/auth/link-wallet — link wallet to existing logged-in account
router.post("/link-wallet", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { publicKey, signature, message } = req.body;
    if (!publicKey || !signature || !message) {
      throw new BadRequestError("publicKey, signature, and message are required");
    }
    const result = await AuthService.linkWallet(req.user!.userId, { publicKey, signature, message });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// ADMIN AUTH (separate subdomain, OTP-only, role-gated)
// ============================================================

// POST /api/auth/admin/request-otp — sends a code ONLY to admin/owner emails.
// For anyone else it returns the same generic success WITHOUT sending anything
// (no account enumeration, and non-admins never receive an admin sign-in code).
router.post("/admin/request-otp", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") throw new BadRequestError("Email required");
    const normalized = email.toLowerCase().trim();
    // Auto-create the account for a configured owner email so they can always
    // sign in; this only affects OWNER_EMAILS addresses.
    await AuthService.ensureOwnerAccount(normalized);
    if (await AuthService.isAdminEmail(normalized)) {
      await EmailService.sendOtp(normalized);
    }
    res.json({ success: true, message: "If that is an administrator account, a sign-in code has been sent." });
  } catch (error) { next(error); }
});

// POST /api/auth/admin/login — verify the OTP and issue tokens ONLY for
// admins/owners. A normal user (even with a valid code) is rejected here, so a
// non-admin is never logged in.
router.post("/admin/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) throw new BadRequestError("Email and code are required");
    const normalized = (email as string).toLowerCase().trim();
    const valid = await EmailService.verifyOtp(normalized, String(otp).trim());
    if (!valid) throw new UnauthorizedError("Invalid or expired code");
    const result = await AuthService.adminLoginByEmail(normalized);
    // No refresh cookie for admin — the 1-day access token IS the session.
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// ============================================================
// GOOGLE OAUTH
// ============================================================

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

// GET /api/auth/google — redirect to Google consent screen
router.get("/google", (req: Request, res: Response) => {
  if (!config.google.clientId || !config.google.clientSecret) {
    return res.redirect(`${config.frontendUrl}/login?error=google_not_configured`);
  }

  const state = require("crypto").randomBytes(16).toString("hex");
  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
  });
  const params = new URLSearchParams({
    client_id:     config.google.clientId,
    redirect_uri:  `${config.backendUrl}/api/auth/google/callback`,
    response_type: "code",
    scope:         "openid email profile",
    access_type:   "offline",
    prompt:        "select_account",
    state,
  });
  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

// GET /api/auth/google/callback — exchange code, issue JWT, redirect to frontend
router.get("/google/callback", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, error, state } = req.query;

    // Validate CSRF state
    const expectedState = req.cookies?.oauth_state;
    res.clearCookie("oauth_state");
    if (!expectedState || state !== expectedState) {
      return res.redirect(`${config.frontendUrl}/login?error=oauth_state_mismatch`);
    }

    if (error || !code) {
      return res.redirect(`${config.frontendUrl}/login?error=google_cancelled`);
    }

    // 1. Exchange code for Google tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code:          code as string,
        client_id:     config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri:  `${config.backendUrl}/api/auth/google/callback`,
        grant_type:    "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      throw new UnauthorizedError("Failed to exchange Google auth code");
    }

    const tokenData = await tokenRes.json() as { access_token: string };

    // 2. Get Google user info
    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      throw new UnauthorizedError("Failed to get Google user info");
    }

    const googleUser = await userRes.json() as {
      id: string;
      email: string;
      name: string;
      picture?: string;
      verified_email?: boolean;
      email_verified?: boolean;
    };

    // Reject explicitly-unverified Google emails — prevents an attacker from
    // presenting a victim's email on an unverified Google identity.
    if (googleUser.verified_email === false || googleUser.email_verified === false) {
      return res.redirect(`${config.frontendUrl}/login?error=google_unverified`);
    }

    // 3. Find or create user
    const result = await AuthService.loginWithGoogle({
      googleId:  googleUser.id,
      email:     googleUser.email,
      name:      googleUser.name,
      avatarUrl: googleUser.picture,
    });

    // 4. Redirect to frontend with tokens in URL fragment (hash) — not sent to server,
    //    not recorded in server access logs or browser history.
    setRefreshCookie(res, result.refreshToken);
    const fragment = new URLSearchParams({
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
    });
    res.redirect(`${config.frontendUrl}/auth/callback#${fragment.toString()}`);
  } catch (error: any) {
    console.error("[Google OAuth callback error]", error?.message ?? error);
    res.redirect(`${config.frontendUrl}/login?error=google_auth_failed`);
  }
});

export default router;
