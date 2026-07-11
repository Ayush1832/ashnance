import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { RoundService } from "../services/roundService";
import { OwnerService } from "../services/ownerService";

const router = Router();

// Map the internal round status to the flat frontend Round shape
function formatRoundStatus(status: Awaited<ReturnType<typeof RoundService.getActiveRoundStatus>>, userId?: string) {
  if (!status.round) return null;
  const r = status.round;
  return {
    id:              r.id,
    number:          r.roundNumber,
    status:          r.status === "COMPLETED" ? "ENDED" : r.status,
    prizePool:       Number(r.currentPool),
    prizePoolTarget: Number(r.prizePoolTarget),
    startedAt:       r.startedAt,
    endsAt:          r.endsAt ?? undefined,
    leaderboard:     status.leaderboard.map((e) => ({
      rank:      e.rank,
      userId:    e.userId,
      username:  e.username,
      weight:    e.cumulativeWeight,
      isAnonymous: false,
      isYou:     userId ? e.userId === userId : false,
    })),
    burnsLast60s: 0,
  };
}

// GET /api/round/current — active round status + caller's rank
router.get("/current", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = await RoundService.getActiveRoundStatus(req.user!.userId);
    res.json({ success: true, data: formatRoundStatus(status, req.user!.userId) });
  } catch (err) {
    next(err);
  }
});

// GET /api/round/current/public — active round status without auth (for public progress bar)
router.get("/current/public", async (_req, res: Response, next: NextFunction) => {
  try {
    const status = await RoundService.getActiveRoundStatus();
    res.json({ success: true, data: formatRoundStatus(status) });
  } catch (err) {
    next(err);
  }
});

// GET /api/round/leaderboard — leaderboard for the active round
// req #9: returns top 10 with distanceToFirst, plus caller's rank/weight even if outside top 10
router.get("/leaderboard", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = await RoundService.getActiveRoundStatus(req.user!.userId);
    res.json({ success: true, data: {
      round:               formatRoundStatus(status, req.user!.userId),
      leaderboard:         status.leaderboard.map((e) => ({
        rank:      e.rank,
        userId:    e.userId,
        username:  e.username,
        weight:    e.cumulativeWeight,
        isAnonymous: false,
        isYou:     e.userId === req.user!.userId,
        distanceToFirst: e.distanceToFirst,
      })),
      userRank:            status.userRank,
      userWeight:          status.userWeight,
      userDistanceToFirst: status.userDistanceToFirst,
    }});
  } catch (err) {
    next(err);
  }
});

// GET /api/round/config — public read of burn config (no auth needed)
router.get("/config", async (_req, res: Response, next: NextFunction) => {
  try {
    const cfg = await OwnerService.getBurnConfig();
    res.json({ success: true, data: cfg });
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
