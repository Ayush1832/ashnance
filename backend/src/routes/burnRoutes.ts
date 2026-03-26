import { Response, NextFunction, Router } from "express";
import { BurnService } from "../services/burnService";
import { burnSchema } from "../utils/validators";
import { authenticate, AuthRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/errors";

const router = Router();

// POST /api/burn — Execute a burn
router.post("/", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = burnSchema.parse(req.body);
    const result = await BurnService.executeBurn(
      req.user!.userId,
      data.amount,
      data.useBoost
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return next(new BadRequestError(error.errors[0].message));
    }
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
