import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { RoundService } from "../services/roundService";

const router = Router();

// GET /api/round/current — active round status + caller's rank
router.get("/current", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await RoundService.getActiveRoundStatus(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/round/current/public — active round status without auth (for public progress bar)
router.get("/current/public", async (_req, res: Response, next: NextFunction) => {
  try {
    const data = await RoundService.getActiveRoundStatus();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/round/leaderboard — leaderboard for the active round
// req #9: returns top 10 with distanceToFirst, plus caller's rank/weight even if outside top 10
router.get("/leaderboard", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await RoundService.getActiveRoundStatus(req.user!.userId);
    res.json({ success: true, data: {
      leaderboard: data.leaderboard,
      round: data.round,
      userRank: data.userRank,
      userWeight: data.userWeight,
      userDistanceToFirst: data.userDistanceToFirst,
    }});
  } catch (err) {
    next(err);
  }
});

// GET /api/round/history — past completed rounds
router.get("/history", async (_req, res: Response, next: NextFunction) => {
  try {
    const rounds = await RoundService.getRoundHistory(10);
    res.json({ success: true, data: rounds });
  } catch (err) {
    next(err);
  }
});

export default router;
