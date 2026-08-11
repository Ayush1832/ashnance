import { Response, NextFunction, Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminAuth";
import { requireOwner } from "../middleware/ownerAuth";
import { prisma } from "../utils/prisma";
import { CreatorWithdrawalService } from "../services/creatorWithdrawalService";
import { BadRequestError, NotFoundError } from "../utils/errors";

const router = Router();

// Every route below requires admin — mirrors adminRoutes.ts's gate pattern.
router.use(authenticate, requireAdmin);

// GET /api/admin/creator/list — all creators, with pool counts
router.get("/list", async (_req, res: Response, next: NextFunction) => {
  try {
    const creators = await prisma.creator.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { pools: true } }, wallet: true },
    });
    res.json({ success: true, data: creators });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/creator/:id/verify — verify a creator; any DRAFT pools they
// already created (blocked on verification) go live.
router.post("/:id/verify", async (req, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const creator = await prisma.creator.update({ where: { id }, data: { verified: true } });
    await prisma.creatorPool.updateMany({
      where: { creatorId: id, status: "DRAFT" },
      data: { status: "ACTIVE" },
    });
    res.json({ success: true, data: creator });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/creator/:id/unverify
router.post("/:id/unverify", async (req, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const creator = await prisma.creator.update({ where: { id }, data: { verified: false } });
    res.json({ success: true, data: creator });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/creator/pools/:id/freeze — halt a pool regardless of its
// status, EXCEPT terminal states (ENDED/ARCHIVED): winners have already been
// paid out of those, so freezing+later unfreezing must never be able to bring
// a settled pool back to ACTIVE.
router.post("/pools/:id/freeze", async (req, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const pool = await prisma.creatorPool.findUnique({ where: { id } });
    if (!pool) throw new NotFoundError("Pool not found");
    if (pool.status === "ENDED" || pool.status === "ARCHIVED") {
      throw new BadRequestError(`Cannot freeze a pool that is already ${pool.status}`);
    }
    const updated = await prisma.creatorPool.update({ where: { id }, data: { status: "FROZEN" } });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/creator/pools/:id/unfreeze — release back to PAUSED; the
// creator must explicitly resume it from there (keeps the resume decision theirs).
router.post("/pools/:id/unfreeze", async (req, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const pool = await prisma.creatorPool.findUnique({ where: { id } });
    if (!pool) throw new NotFoundError("Pool not found");
    if (pool.status !== "FROZEN") throw new NotFoundError("Pool is not frozen");
    const updated = await prisma.creatorPool.update({ where: { id }, data: { status: "PAUSED" } });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/creator/withdrawals/pending
router.get("/withdrawals/pending", async (_req, res: Response, next: NextFunction) => {
  try {
    const requests = await CreatorWithdrawalService.listPending();
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/creator/withdrawals/:id/approve — executes a real on-chain
// USDC transfer, so it requires owner tier (same trust level as
// OwnerWithdrawalRequest approval), not just plain admin.
router.post("/withdrawals/:id/approve", requireOwner, async (req, res: Response, next: NextFunction) => {
  try {
    const result = await CreatorWithdrawalService.approveAndExecute(String(req.params.id));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/creator/withdrawals/:id/reject — no funds move, but kept at
// owner tier alongside approve so the two actions share one review gate.
router.post("/withdrawals/:id/reject", requireOwner, async (req, res: Response, next: NextFunction) => {
  try {
    const result = await CreatorWithdrawalService.reject(String(req.params.id));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/creator/contributions — audit view, most recent across all pools
router.get("/contributions", async (req, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const contributions = await prisma.creatorPoolContribution.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { username: true } },
        pool: { select: { name: true, slug: true, creator: { select: { displayName: true, slug: true } } } },
      },
    });
    res.json({ success: true, data: contributions });
  } catch (error) {
    next(error);
  }
});

export default router;
