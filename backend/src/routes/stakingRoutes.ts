import { Response, NextFunction, Router } from "express";
import { StakingService } from "../services/stakingService";
import { authenticate, AuthRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/errors";

const router = Router();

// Derive a stable "kind" key from pool name for frontend color/identity lookup.
// "EMBER POOL" → "EMBER", "FLAME POOL" → "FLAME", etc.
function poolKind(name: string): string {
  return name.split(/\s+/)[0]?.toUpperCase() ?? name;
}

function formatPool(pool: {
  id: string;
  name: string;
  apy: unknown;
  lockDays: number;
  minStake: unknown;
  description: string | null;
}) {
  return {
    id:          pool.id,                   // DB UUID (used to match positions)
    kind:        poolKind(pool.name),       // "EMBER" | "FLAME" | "INFERNO"
    name:        pool.name,
    apy:         Number(pool.apy),
    lockDays:    pool.lockDays,
    minAsh:      Number(pool.minStake),
    description: pool.description ?? undefined,
  };
}

function formatPosition(pos: {
  id: string;
  poolId: string;
  amount: unknown;
  lockedUntil: Date;
  status: string;
  pendingRewards?: number;
}) {
  return {
    id:        pos.id,
    poolId:    pos.poolId,
    staked:    Number(pos.amount),
    pending:   Number(pos.pendingRewards ?? 0),
    unlocksAt: pos.lockedUntil.toISOString(),
    status:    pos.status,
  };
}

// GET /api/staking/pools — List available staking pools
router.get("/pools", async (_req, res: Response, next: NextFunction) => {
  try {
    const pools = await StakingService.getPools();
    res.json({ success: true, data: pools.map(formatPool) });
  } catch (error) {
    next(error);
  }
});

// GET /api/staking/positions — Get user's staking positions
router.get("/positions", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const positions = await StakingService.getPositions(req.user!.userId);
    res.json({ success: true, data: positions.map(formatPosition) });
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
