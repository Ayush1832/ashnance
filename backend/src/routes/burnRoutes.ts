import { Response, NextFunction, Router } from "express";
import { BurnService } from "../services/burnService";
import { burnSchema } from "../utils/validators";
import { authenticate, AuthRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/errors";
import { broadcastBurnEvent, broadcastRoundEndEvent } from "../websocket/socketHandler";
import { prisma } from "../utils/prisma";

const router = Router();

// POST /api/burn — Execute a burn
router.post("/", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = burnSchema.parse(req.body);
    const result = await BurnService.executeBurn(req.user!.userId, data.amount);

    // Fetch username for WebSocket broadcast (non-critical)
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { username: true },
      });

      broadcastBurnEvent({
        username:            user?.username ?? "Anonymous",
        amount:              data.amount,
        ashReward:           result.ashReward,
        finalWeight:         result.finalWeight,
        roundCurrentPool:    result.roundCurrentPool,
        roundTargetPool:     result.roundTargetPool,
        roundProgressPercent: result.roundProgressPercent,
      });

      // If this burn ended the round, announce to all connected clients
      if (result.roundEnded && result.roundWinner && result.roundPrize != null && result.roundNumber != null) {
        broadcastRoundEndEvent({
          roundNumber:    result.roundNumber,
          winnerUsername: result.roundWinner,
          prizeAmount:    result.roundPrize,
        });
      }
    } catch {
      // WebSocket errors must never fail the HTTP response
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return next(new BadRequestError(error.errors[0].message));
    }
    next(error);
  }
});

// POST /api/burn/boost — Activate 1-hour ASH boost
router.post("/boost", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await BurnService.activateBoost(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/burn/boost-status — Check current boost status
router.get("/boost-status", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = await BurnService.getBoostStatus(req.user!.userId);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

// GET /api/burn/history — Get burn history
router.get("/history", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await BurnService.getBurnHistory(req.user!.userId, page, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/burn/stats — Get burn stats
router.get("/stats", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await BurnService.getBurnStats(req.user!.userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

export default router;
