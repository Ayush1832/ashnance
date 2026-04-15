import { Router, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { requireOwner } from "../middleware/ownerAuth";
import { OwnerService } from "../services/ownerService";
import { RoundService } from "../services/roundService";
import { BadRequestError } from "../utils/errors";
import { AuthRequest } from "../middleware/auth";

const router = Router();

// All owner routes require auth + owner check
router.use(authenticate, requireOwner);

// GET /api/owner/me — verify ownership
router.get("/me", (req: AuthRequest, res: Response) => {
  res.json({ success: true, email: req.user!.email });
});

// GET /api/owner/stats
router.get("/stats", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await OwnerService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
});

// GET /api/owner/profit-pool
router.get("/profit-pool", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [pool, withdrawals] = await Promise.all([
      OwnerService.getProfitPool(),
      OwnerService.getWithdrawals(),
    ]);
    res.json({ success: true, data: { pool, withdrawals } });
  } catch (err) { next(err); }
});

// GET /api/owner/withdrawal/pending
router.get("/withdrawal/pending", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import("../utils/prisma");
    const pending = await prisma.ownerWithdrawalRequest.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: pending });
  } catch (err) { next(err); }
});

// POST /api/owner/withdrawal/initiate
router.post("/withdrawal/initiate", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const request = await OwnerService.initiateWithdrawal(req.user!.email);
    res.json({ success: true, data: request });
  } catch (err) { next(err); }
});

// POST /api/owner/withdrawal/approve/:id
router.post("/withdrawal/approve/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await OwnerService.approveWithdrawal(req.user!.email, req.params.id as string);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/owner/withdrawal/cancel/:id
router.post("/withdrawal/cancel/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await OwnerService.cancelWithdrawal(req.user!.email, req.params.id as string);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/owner/burn-config
router.get("/burn-config", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const config = await OwnerService.getBurnConfig();
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
});

// PUT /api/owner/burn-config
router.put("/burn-config", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updates = req.body as Record<string, number>;
    const config = await OwnerService.saveBurnConfig(updates);
    res.json({ success: true, data: config });
  } catch (err) { next(err); }
});

// GET /api/owner/solvency
router.get("/solvency", async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await OwnerService.getSolvency();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ---- ROUND MANAGEMENT ----

// POST /api/owner/round — create a new round
router.post("/round", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const burnCfg = await OwnerService.getBurnConfig();
    const prizePoolTarget = Number(req.body.prizePoolTarget ?? burnCfg.prize_pool_target ?? 500);
    if (isNaN(prizePoolTarget) || prizePoolTarget <= 0) {
      return next(new BadRequestError("prizePoolTarget must be a positive number"));
    }
    // req #6 — time limit: use provided value, fall back to config default, fall back to 24h
    const rawLimit = req.body.timeLimitHours;
    const timeLimitHours = rawLimit !== undefined
      ? Number(rawLimit)
      : (burnCfg.round_time_limit_hours ?? 24);
    if (isNaN(timeLimitHours) || timeLimitHours <= 0) {
      return next(new BadRequestError("timeLimitHours must be a positive number"));
    }
    const round = await RoundService.createRound(prizePoolTarget, timeLimitHours);
    res.json({ success: true, data: round });
  } catch (err) { next(err); }
});

// POST /api/owner/round/:id/end — manually end a round and pay winner (force = skip anti-snipe)
router.post("/round/:id/end", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const force = req.body.force === true;
    const result = await RoundService.endRound(req.params.id as string, force);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/owner/round/:id/cancel — cancel a round without paying prize
router.post("/round/:id/cancel", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await RoundService.cancelRound(req.params.id as string);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/owner/rounds — list all rounds (for admin panel)
router.get("/rounds", async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rounds = await RoundService.getRoundHistory(20);
    const active = await RoundService.getActiveRound();
    res.json({ success: true, data: { active, history: rounds } });
  } catch (err) { next(err); }
});

export default router;
