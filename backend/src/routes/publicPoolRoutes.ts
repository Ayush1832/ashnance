import { Response, NextFunction, Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { CreatorPoolService } from "../services/creatorPoolService";
import { CreatorContributionService } from "../services/creatorContributionService";
import { CreatorReferralService } from "../services/creatorReferralService";
import { contributeToPoolSchema, followCreatorSchema } from "../utils/validators";
import { BadRequestError } from "../utils/errors";
import { prisma } from "../utils/prisma";
import {
  broadcastCreatorPoolContribution,
  broadcastCreatorPoolProgress,
} from "../websocket/socketHandler";

const router = Router();

// GET /api/pools/:creatorSlug/:poolSlug — public pool page data
router.get("/:creatorSlug/:poolSlug", async (req, res, next: NextFunction) => {
  try {
    const creatorSlug = String(req.params.creatorSlug);
    const poolSlug = String(req.params.poolSlug);
    const result = await CreatorPoolService.getPoolBySlug(creatorSlug, poolSlug);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/pools/:creatorSlug/:poolSlug/contribute
router.post(
  "/:creatorSlug/:poolSlug/contribute",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = contributeToPoolSchema.parse(req.body);
      const creatorSlug = String(req.params.creatorSlug);
      const poolSlug = String(req.params.poolSlug);

      const creator = await prisma.creator.findUnique({ where: { slug: creatorSlug } });
      if (!creator) throw new BadRequestError("Creator not found");
      const pool = await prisma.creatorPool.findUnique({
        where: { creatorId_slug: { creatorId: creator.id, slug: poolSlug } },
      });
      if (!pool) throw new BadRequestError("Pool not found");

      const result = await CreatorContributionService.executeContribution(
        req.user!.userId,
        pool.id,
        data.amount
      );

      try {
        const user = await prisma.user.findUnique({
          where: { id: req.user!.userId },
          select: { username: true },
        });
        broadcastCreatorPoolContribution(pool.id, {
          username: user?.username ?? "Anonymous",
          amount: data.amount,
          poolCurrentValue: result.poolCurrentValue,
        });
        const participantCount = await prisma.creatorPoolParticipant.count({
          where: { poolId: pool.id },
        });
        broadcastCreatorPoolProgress(pool.id, {
          poolCurrentValue: result.poolCurrentValue,
          participantCount,
        });
      } catch {
        // WebSocket errors must never fail the HTTP response
      }

      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error?.name === "ZodError") {
        return next(new BadRequestError(error.errors[0].message));
      }
      next(error);
    }
  }
);

// POST /api/pools/:creatorSlug/follow — associate the caller with a creator,
// optionally via their referral code (?ref= carried from the public pool page)
router.post("/:creatorSlug/follow", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = followCreatorSchema.parse(req.body);
    const creatorSlug = String(req.params.creatorSlug);
    const follower = await CreatorReferralService.follow(req.user!.userId, creatorSlug, data.referralCode);
    res.json({ success: true, data: follower });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return next(new BadRequestError(error.errors[0].message));
    }
    next(error);
  }
});

export default router;
