import { Response, NextFunction, Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../utils/prisma";

const router = Router();

// GET /api/referrals — list referrals made by the authenticated user
router.get("/", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: req.user!.userId },
      include: {
        referee: {
          select: { username: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = referrals.map((r) => ({
      id: r.id,
      username: r.referee.username,
      joinedAt: r.referee.createdAt.toISOString(),
      burnCount: r.totalBurns,
      earned: Number(r.totalEarned),
      active: r.isActive,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
