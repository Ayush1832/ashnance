import { Request, Response, NextFunction, Router } from "express";
import { LeaderboardService } from "../services/leaderboardService";
import { TwoFAService } from "../services/twoFAService";
import { authenticate, AuthRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/errors";
import { prisma } from "../utils/prisma";
import { subscribeSchema } from "../utils/validators";

const router = Router();

// ============== LAUNCH MODE + WAITLIST (Coming Soon) ==============

// GET /api/launch-status — public; tells the frontend whether to show the Coming
// Soon page and what date the countdown targets.
router.get("/launch-status", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.platformConfig.findMany({
      where: { key: { in: ["launch_mode", "launch_at"] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json({
      success: true,
      data: {
        launchMode: map["launch_mode"] === "on",
        launchAt: map["launch_at"] || null,
      },
    });
  } catch (error) { next(error); }
});

// POST /api/subscribe — public waitlist signup (rate-limited in server.ts).
router.post("/subscribe", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = subscribeSchema.parse(req.body);
    const email = parsed.email.toLowerCase();
    const fwd = req.headers["x-forwarded-for"];
    const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim() || req.ip || null;
    try {
      await prisma.subscriber.create({ data: { email, ipAddress: ip, source: "Landing Page" } });
    } catch (e: any) {
      // Duplicate email → treat as success (idempotent, prevents enumeration).
      if (e?.code === "P2002") {
        return res.json({ success: true, data: { alreadySubscribed: true }, message: "You're already on the list." });
      }
      throw e;
    }
    res.json({ success: true, data: { subscribed: true }, message: "You're on the list — we'll be in touch." });
  } catch (error: any) {
    if (error?.name === "ZodError") return next(new BadRequestError(error.errors[0].message));
    next(error);
  }
});

// ============== LEADERBOARD ROUTES ==============

// GET /api/leaderboard/winners
router.get("/leaderboard/winners", async (_req, res: Response, next: NextFunction) => {
  try {
    const data = await LeaderboardService.getTopWinners();
    res.json({ success: true, data: data.map((r) => ({
      rank:      r.rank,
      username:  r.username,
      primary:   Number(r.totalWon ?? 0),
      secondary: r.winCount,
      anonymous: false,
    })) });
  } catch (error) { next(error); }
});

// GET /api/leaderboard/burners
router.get("/leaderboard/burners", async (_req, res: Response, next: NextFunction) => {
  try {
    const data = await LeaderboardService.getTopBurners();
    res.json({ success: true, data: data.map((r) => ({
      rank:      r.rank,
      username:  r.username,
      primary:   Number(r.totalBurned ?? 0),
      secondary: r.burnCount,
      anonymous: false,
    })) });
  } catch (error) { next(error); }
});

// GET /api/leaderboard/referrers
router.get("/leaderboard/referrers", async (_req, res: Response, next: NextFunction) => {
  try {
    const data = await LeaderboardService.getTopReferrers();
    res.json({ success: true, data: data.map((r) => ({
      rank:      r.rank,
      username:  r.username,
      primary:   Number(r.totalEarned ?? 0),
      secondary: r.referralCount,
      anonymous: false,
    })) });
  } catch (error) { next(error); }
});

// GET /api/leaderboard/ash
router.get("/leaderboard/ash", async (_req, res: Response, next: NextFunction) => {
  try {
    const data = await LeaderboardService.getTopAshHolders();
    res.json({ success: true, data: data.map((r) => ({
      rank:      r.rank,
      username:  r.username,
      primary:   Number(r.ashBalance ?? 0),
      anonymous: false,
    })) });
  } catch (error) { next(error); }
});

// ============== 2FA ROUTES ==============

// POST /api/2fa/generate
router.post("/2fa/generate", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await TwoFAService.generateSecret(req.user!.userId);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

// POST /api/2fa/enable
router.post("/2fa/enable", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token) throw new BadRequestError("Token required");
    const data = await TwoFAService.enable(req.user!.userId, token);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

// POST /api/2fa/disable
router.post("/2fa/disable", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token) throw new BadRequestError("Token required");
    const data = await TwoFAService.disable(req.user!.userId, token);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

export default router;
