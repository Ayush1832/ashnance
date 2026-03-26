import { Request, Response, NextFunction, Router } from "express";
import { AuthService } from "../services/authService";
import { registerSchema, loginSchema, otpVerifySchema } from "../utils/validators";
import { authenticate, AuthRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/errors";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
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

export default router;
