import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { VipService, VipTier } from "../services/vipService";
import { BadRequestError } from "../utils/errors";

const router = Router();

// GET /api/vip/status
router.get("/status", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await VipService.getStatus(req.user!.userId);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

// POST /api/vip/subscribe
router.post("/subscribe", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tier } = req.body;
    if (!tier || !["SPARK", "ACTIVE_ASH", "HOLY_FIRE"].includes(tier)) {
      throw new BadRequestError("Invalid tier. Choose: SPARK, ACTIVE_ASH, or HOLY_FIRE");
    }
    const data = await VipService.subscribe(req.user!.userId, tier as VipTier);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

// POST /api/vip/cancel
router.post("/cancel", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await VipService.cancel(req.user!.userId);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

export default router;
