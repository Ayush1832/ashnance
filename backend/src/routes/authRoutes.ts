import { Request, Response, NextFunction, Router } from "express";
import { AuthService } from "../services/authService";
import { registerSchema, loginSchema, updateProfileSchema } from "../utils/validators";
import { authenticate, AuthRequest } from "../middleware/auth";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { EmailService } from "../services/emailService";

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

export default router;
