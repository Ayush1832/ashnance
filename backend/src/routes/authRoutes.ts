import { Request, Response, NextFunction, Router } from "express";
import { AuthService } from "../services/authService";
import { registerSchema, loginSchema, updateProfileSchema } from "../utils/validators";
import { authenticate, AuthRequest } from "../middleware/auth";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { EmailService } from "../services/emailService";
import { config } from "../config";

const router = Router();

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
    const valid = EmailService.verifyOtp(email.toLowerCase().trim(), otp.toString().trim());
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
      const valid = EmailService.verifyOtp(email.toLowerCase().trim(), otp.toString().trim());
      if (!valid) throw new UnauthorizedError("Invalid or expired OTP");
      const result = await AuthService.register({ email: email.toLowerCase().trim(), username, referralCode });
      return res.status(201).json({ success: true, data: result });
    }
    const data = registerSchema.parse(req.body);
    const result = await AuthService.register(data);

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
      const valid = EmailService.verifyOtp(email.toLowerCase().trim(), otp.toString().trim());
      if (!valid) throw new UnauthorizedError("Invalid or expired OTP");
      const result = await AuthService.loginByEmail(email.toLowerCase().trim());
      return res.json({ success: true, data: result });
    }
    const data = loginSchema.parse(req.body);
    if (!data.password) {
      throw new BadRequestError("Password is required for email login");
    }
    const result = await AuthService.login(data.email, data.password);

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

// POST /api/auth/refresh
router.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new BadRequestError("Refresh token required");

    const tokens = await AuthService.refreshToken(refreshToken);

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
    const { refreshToken } = req.body;
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }

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

// POST /api/auth/wallet — verify wallet signature, return JWT
router.post("/wallet", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { publicKey, signature, message } = req.body;
    if (!publicKey || !signature || !message) {
      throw new BadRequestError("publicKey, signature, and message are required");
    }
    const result = await AuthService.loginWithWallet({ publicKey, signature, message });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// GOOGLE OAUTH
// ============================================================

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

// GET /api/auth/google — redirect to Google consent screen
router.get("/google", (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id:     config.google.clientId,
    redirect_uri:  `${process.env.BACKEND_URL || "http://localhost:4000"}/api/auth/google/callback`,
    response_type: "code",
    scope:         "openid email profile",
    access_type:   "offline",
    prompt:        "select_account",
  });
  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

// GET /api/auth/google/callback — exchange code, issue JWT, redirect to frontend
router.get("/google/callback", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, error } = req.query;

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
        redirect_uri:  `${process.env.BACKEND_URL || "http://localhost:4000"}/api/auth/google/callback`,
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
    };

    // 3. Find or create user
    const result = await AuthService.loginWithGoogle({
      googleId:  googleUser.id,
      email:     googleUser.email,
      name:      googleUser.name,
      avatarUrl: googleUser.picture,
    });

    // 4. Redirect to frontend with tokens in query params
    //    (frontend reads them from URL and stores in localStorage)
    const params = new URLSearchParams({
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
    });
    res.redirect(`${config.frontendUrl}/auth/callback?${params.toString()}`);
  } catch (error) {
    next(error);
  }
});

export default router;
