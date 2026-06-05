import { Router, Response, NextFunction, Request } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminAuth";
import { prisma } from "../utils/prisma";
import { BadRequestError } from "../utils/errors";
import { updatePrizeConfigSchema } from "../utils/validators";

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
    // Validate the (partial) body against the prize-config bounds — prevents
    // mass-assignment / out-of-range values feeding prize-payout math.
    const data = updatePrizeConfigSchema.omit({ tier: true }).partial().parse(req.body);

    const prize = await prisma.prizeConfig.update({
      where: { tier: tier as "JACKPOT" | "BIG" | "MEDIUM" | "SMALL" },
      data,
    });

    res.json({ success: true, data: prize });
  } catch (error: any) {
    if (error?.name === "ZodError") return next(new BadRequestError(error.errors[0].message));
    next(error);
  }
});

// ============== PLATFORM CONFIG ==============

// GET /api/admin/config
// Returns the merged burn config with default values for missing keys,
// and all values converted to numbers (PlatformConfig stores them as strings).
router.get("/config", async (_req, res: Response, next: NextFunction) => {
  try {
    const { OwnerService } = await import("../services/ownerService");
    const config = await OwnerService.getBurnConfig();
    res.json({ success: true, data: config });
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
    const page = Math.max(1, Number(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit as string) || 20));

    const [rawUsers, total] = await Promise.all([
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
          isBanned: true,
          createdAt: true,
          _count: { select: { burns: true } },
        },
      }),
      prisma.user.count(),
    ]);

    // Map to frontend-expected shape: rename isBanned → banned, isVip+vipTier → vip
    const users = rawUsers.map((u) => ({
      id:        u.id,
      email:     u.email,
      username:  u.username,
      role:      u.role,
      vip:       u.isVip ? u.vipTier : null,
      banned:    u.isBanned,
      createdAt: u.createdAt,
      burns:     u._count.burns,
    }));

    res.json({ success: true, data: { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
});

// PUT /api/admin/users/:id/role
router.put("/users/:id/role", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;
    if (!["USER", "ADMIN"].includes(role)) throw new BadRequestError("Invalid role");
    if (id === req.user!.userId) throw new BadRequestError("You cannot change your own role.");

    const user = await prisma.user.update({
      where: { id },
      data: { role: role as "USER" | "ADMIN" },
      select: { id: true, email: true, username: true, role: true },
    });

    res.json({ success: true, data: user });
  } catch (error) { next(error); }
});

// PUT /api/admin/users/:id/ban — ban or unban a user
router.put("/users/:id/ban", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { ban } = req.body;
    if (id === req.user!.userId) throw new BadRequestError("You cannot ban yourself.");
    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: !!ban },
      select: { id: true, username: true, isBanned: true },
    });
    // On ban, revoke all refresh tokens so the user can't refresh a session; the
    // access token is also rejected centrally by authenticate() (isBanned check).
    if (ban) {
      await prisma.refreshToken.updateMany({
        where: { userId: id, isRevoked: false },
        data: { isRevoked: true },
      });
    }
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
