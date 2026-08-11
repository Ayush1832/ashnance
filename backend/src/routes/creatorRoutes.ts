import { Response, NextFunction, Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { requireCreator, CreatorRequest } from "../middleware/creatorAuth";
import { CreatorService } from "../services/creatorService";
import { CreatorPoolService } from "../services/creatorPoolService";
import { CreatorWithdrawalService } from "../services/creatorWithdrawalService";
import { CreatorReferralService } from "../services/creatorReferralService";
import { CreatorAnalyticsService } from "../services/creatorAnalyticsService";
import {
  createCreatorProfileSchema,
  updateCreatorProfileSchema,
  createCreatorPoolSchema,
  updateCreatorPoolSchema,
  requestCreatorWithdrawalSchema,
} from "../utils/validators";
import { BadRequestError } from "../utils/errors";
import {
  broadcastCreatorPoolStarted,
  broadcastCreatorPoolEnded,
  broadcastCreatorPoolWinner,
} from "../websocket/socketHandler";
import { prisma } from "../utils/prisma";

const router = Router();

function zodOrNext(error: any, next: NextFunction) {
  if (error?.name === "ZodError") {
    return next(new BadRequestError(error.errors[0].message));
  }
  next(error);
}

// POST /api/creator/profile — claim a creator profile
router.post("/profile", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createCreatorProfileSchema.parse(req.body);
    const creator = await CreatorService.createProfile(req.user!.userId, data);
    res.json({ success: true, data: creator });
  } catch (error) {
    zodOrNext(error, next);
  }
});

// GET /api/creator/profile — get caller's creator profile
router.get(
  "/profile",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const creator = await CreatorService.getByUserId(req.user!.userId);
      res.json({ success: true, data: creator });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/creator/profile — update caller's creator profile
router.put(
  "/profile",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const data = updateCreatorProfileSchema.parse(req.body);
      const creator = await CreatorService.updateProfile(req.user!.userId, data);
      res.json({ success: true, data: creator });
    } catch (error) {
      zodOrNext(error, next);
    }
  }
);

// GET /api/creator/pools — list caller's pools
router.get(
  "/pools",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const pools = await CreatorPoolService.listCreatorPools(req.creator!.id);
      res.json({ success: true, data: pools });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/creator/pools — create a pool
router.post(
  "/pools",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const data = createCreatorPoolSchema.parse(req.body);
      const pool = await CreatorPoolService.createPool(req.creator!.id, data);
      if (pool.status === "ACTIVE") broadcastCreatorPoolStarted(pool.id, pool.name);
      res.json({ success: true, data: pool });
    } catch (error) {
      zodOrNext(error, next);
    }
  }
);

// PUT /api/creator/pools/:id — update a pool
router.put(
  "/pools/:id",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const data = updateCreatorPoolSchema.parse(req.body);
      const pool = await CreatorPoolService.updatePool(req.creator!.id, String(req.params.id), data);
      res.json({ success: true, data: pool });
    } catch (error) {
      zodOrNext(error, next);
    }
  }
);

// POST /api/creator/pools/:id/pause
router.post(
  "/pools/:id/pause",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const pool = await CreatorPoolService.pausePool(req.creator!.id, String(req.params.id));
      res.json({ success: true, data: pool });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/creator/pools/:id/resume
router.post(
  "/pools/:id/resume",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const pool = await CreatorPoolService.resumePool(req.creator!.id, String(req.params.id));
      broadcastCreatorPoolStarted(pool.id, pool.name);
      res.json({ success: true, data: pool });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/creator/pools/:id/end — end the pool, select winner(s) by weight, pay out
router.post(
  "/pools/:id/end",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const result = await CreatorPoolService.endPool(req.creator!.id, String(req.params.id));
      broadcastCreatorPoolEnded(result.pool.id, result.pool.name);
      if (result.winners.length > 0) {
        const winner = result.winners[0];
        const user = await prisma.user.findUnique({ where: { id: winner.userId }, select: { username: true } });
        broadcastCreatorPoolWinner(result.pool.id, {
          winnerUsername: user?.username ?? "Anonymous",
          prizeAmount: winner.prizeAmount,
        });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/creator/pools/:id/archive
router.post(
  "/pools/:id/archive",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const pool = await CreatorPoolService.archivePool(req.creator!.id, String(req.params.id));
      res.json({ success: true, data: pool });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/creator/pools/:id/duplicate — body: { slug }
router.post(
  "/pools/:id/duplicate",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const slug = String(req.body?.slug || "");
      if (!/^[a-z0-9-]{3,48}$/.test(slug)) {
        throw new BadRequestError("Provide a valid new slug (lowercase letters, numbers, hyphens)");
      }
      const pool = await CreatorPoolService.duplicatePool(req.creator!.id, String(req.params.id), slug);
      res.json({ success: true, data: pool });
    } catch (error) {
      next(error);
    }
  }
);

// ── Withdrawals ──────────────────────────────────────────────────────────

// GET /api/creator/withdrawals — list caller's withdrawal requests
router.get(
  "/withdrawals",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const requests = await CreatorWithdrawalService.listForCreator(req.creator!.id);
      res.json({ success: true, data: requests });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/creator/withdrawals — request a withdrawal
router.post(
  "/withdrawals",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const data = requestCreatorWithdrawalSchema.parse(req.body);
      const request = await CreatorWithdrawalService.requestWithdrawal(req.creator!.id, data.amount, data.address);
      res.json({ success: true, data: request });
    } catch (error) {
      zodOrNext(error, next);
    }
  }
);

// ── Referrals ────────────────────────────────────────────────────────────

// GET /api/creator/referrals — referral stats for caller's creator profile
router.get(
  "/referrals",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await CreatorReferralService.getStats(req.creator!.id);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

// ── Analytics ────────────────────────────────────────────────────────────

// GET /api/creator/pools/:id/analytics
router.get(
  "/pools/:id/analytics",
  authenticate,
  requireCreator,
  async (req: CreatorRequest, res: Response, next: NextFunction) => {
    try {
      const analytics = await CreatorAnalyticsService.getPoolAnalytics(req.creator!.id, String(req.params.id));
      res.json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
