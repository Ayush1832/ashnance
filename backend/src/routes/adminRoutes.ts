import { Router, Response, NextFunction, Request } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminAuth";
import { prisma } from "../utils/prisma";
import { BadRequestError } from "../utils/errors";

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

// ============== OVERVIEW ==============

// GET /api/admin/stats
router.get("/stats", async (_req, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      totalBurns,
      totalVips,
      totalReferrals,
      rewardPool,
      burnStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.burn.count(),
      prisma.user.count({ where: { isVip: true } }),
      prisma.referral.count(),
      prisma.rewardPool.findFirst(),
      prisma.burn.aggregate({ _sum: { amountUsdc: true, prizeAmount: true } }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalBurns,
        activeVips: totalVips,
        totalReferrals,
        rewardPoolBalance: rewardPool?.totalBalance || 0,
        totalPaidOut: rewardPool?.totalPaidOut || 0,
        totalBurned: burnStats._sum.amountUsdc || 0,
        totalPrizesAwarded: burnStats._sum.prizeAmount || 0,
      },
    });
  } catch (error) { next(error); }
});

// ============== PRIZE CONFIG ==============

// GET /api/admin/prizes
router.get("/prizes", async (_req, res: Response, next: NextFunction) => {
  try {
    const prizes = await prisma.prizeConfig.findMany({ orderBy: { tier: "asc" } });
    res.json({ success: true, data: prizes });
  } catch (error) { next(error); }
});

// PUT /api/admin/prizes/:tier
router.put("/prizes/:tier", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tier = req.params.tier as string;
    const { value, poolPercent, probability, isActive } = req.body;

    const prize = await prisma.prizeConfig.update({
      where: { tier: tier as "JACKPOT" | "BIG" | "MEDIUM" | "SMALL" },
      data: {
        ...(value !== undefined && { value }),
        ...(poolPercent !== undefined && { poolPercent }),
        ...(probability !== undefined && { probability }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: prize });
  } catch (error) { next(error); }
});

// ============== PLATFORM CONFIG ==============

// GET /api/admin/config
router.get("/config", async (_req, res: Response, next: NextFunction) => {
  try {
    const configs = await prisma.platformConfig.findMany();
    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));
    res.json({ success: true, data: configMap });
  } catch (error) { next(error); }
});

// PUT /api/admin/config/:key
router.put("/config/:key", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const key = req.params.key as string;
    const { value } = req.body;
    if (value === undefined) throw new BadRequestError("Value required");

    const config = await prisma.platformConfig.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });

    res.json({ success: true, data: config });
  } catch (error) { next(error); }
});

// ============== USER MANAGEMENT ==============

// GET /api/admin/users?page=1&limit=20
router.get("/users", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page as string) || 1;
    const limit = Number(req.query.limit as string) || 20;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          username: true,
          isVip: true,
          vipTier: true,
          role: true,
          createdAt: true,
          _count: { select: { burns: true } },
        },
      }),
      prisma.user.count(),
    ]);

    res.json({ success: true, data: { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
});

// PUT /api/admin/users/:id/role
router.put("/users/:id/role", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;
    if (!["USER", "ADMIN"].includes(role)) throw new BadRequestError("Invalid role");

    const user = await prisma.user.update({
      where: { id },
      data: { role: role as "USER" | "ADMIN" },
      select: { id: true, email: true, username: true, role: true },
    });

    res.json({ success: true, data: user });
  } catch (error) { next(error); }
});

// ============== REWARD POOL ==============

// GET /api/admin/pool
router.get("/pool", async (_req, res: Response, next: NextFunction) => {
  try {
    const pool = await prisma.rewardPool.findFirst();
    res.json({ success: true, data: pool });
  } catch (error) { next(error); }
});

export default router;
