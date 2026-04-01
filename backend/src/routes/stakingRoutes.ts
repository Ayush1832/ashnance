import { Response, NextFunction, Router } from "express";
import { StakingService } from "../services/stakingService";
import { authenticate, AuthRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/errors";

const router = Router();

// GET /api/staking/pools — List available staking pools
router.get("/pools", async (_req, res: Response, next: NextFunction) => {
  try {
    const pools = await StakingService.getPools();
    res.json({ success: true, data: pools });
  } catch (error) {
    next(error);
  }
});

// GET /api/staking/positions — Get user's staking positions
router.get("/positions", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const positions = await StakingService.getPositions(req.user!.userId);
    res.json({ success: true, data: positions });
  } catch (error) {
    next(error);
  }
});

// GET /api/staking/summary — Get user's staking summary
router.get("/summary", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const summary = await StakingService.getSummary(req.user!.userId);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

// POST /api/staking/stake — Stake ASH into a pool
router.post("/stake", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { poolId, amount } = req.body;
    if (!poolId) return next(new BadRequestError("poolId is required"));
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return next(new BadRequestError("Valid amount is required"));
    }
    const result = await StakingService.stake(req.user!.userId, poolId, Number(amount));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/staking/claim/:positionId — Claim rewards
router.post("/claim/:positionId", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await StakingService.claimRewards(
      req.user!.userId,
      req.params.positionId as string
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/staking/unstake/:positionId — Unstake principal + rewards
router.post("/unstake/:positionId", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await StakingService.unstake(
      req.user!.userId,
      req.params.positionId as string
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
