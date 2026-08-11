import { Response, NextFunction, Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { BattleService } from "../services/battleService";
import { battleActionSchema } from "../utils/validators";
import { BadRequestError } from "../utils/errors";
import { prisma } from "../utils/prisma";
import { broadcastCreatorPoolBattle } from "../websocket/socketHandler";

const router = Router();

// POST /api/battle/:poolId/action — perform a battle action in a pool
router.post("/:poolId/action", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = battleActionSchema.parse(req.body);
    const poolId = String(req.params.poolId);

    const result = await BattleService.performAction(req.user!.userId, poolId, data.actionType, {
      targetUserId: data.targetUserId,
      ashAmount: data.ashAmount,
    });

    try {
      const actor = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { username: true } });
      broadcastCreatorPoolBattle(poolId, {
        actor: actor?.username ?? "Anonymous",
        actionType: result.actionType,
        targetUserId: data.targetUserId,
        weightDelta: result.weightDelta,
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
});

// GET /api/battle/:poolId/log — recent battle events for a pool (public)
router.get("/:poolId/log", async (req, res, next: NextFunction) => {
  try {
    const poolId = String(req.params.poolId);
    const log = await BattleService.getBattleLog(poolId);
    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
});

export default router;
