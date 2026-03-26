import { Response, NextFunction, Router } from "express";
import { LeaderboardService } from "../services/leaderboardService";
import { TwoFAService } from "../services/twoFAService";
import { authenticate, AuthRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/errors";

const router = Router();

// ============== LEADERBOARD ROUTES ==============

// GET /api/leaderboard/winners
router.get("/leaderboard/winners", async (_req, res: Response, next: NextFunction) => {
  try {
    const data = await LeaderboardService.getTopWinners();
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

// GET /api/leaderboard/burners
router.get("/leaderboard/burners", async (_req, res: Response, next: NextFunction) => {
  try {
    const data = await LeaderboardService.getTopBurners();
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

// GET /api/leaderboard/referrers
router.get("/leaderboard/referrers", async (_req, res: Response, next: NextFunction) => {
  try {
    const data = await LeaderboardService.getTopReferrers();
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

// GET /api/leaderboard/ash
router.get("/leaderboard/ash", async (_req, res: Response, next: NextFunction) => {
  try {
    const data = await LeaderboardService.getTopAshHolders();
    res.json({ success: true, data });
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
