import { Response, NextFunction, Router } from "express";
import { WalletService } from "../services/walletService";
import { depositSchema, withdrawSchema } from "../utils/validators";
import { authenticate, AuthRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/errors";

const router = Router();

// GET /api/wallet — Get wallet balance
router.get("/", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const wallet = await WalletService.getWallet(req.user!.userId);
    res.json({ success: true, data: wallet });
  } catch (error) {
    next(error);
  }
});

// POST /api/wallet/deposit — Process deposit
router.post("/deposit", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = depositSchema.parse(req.body);
    const result = await WalletService.processDeposit(
      req.user!.userId,
      data.amount,
      data.txHash
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return next(new BadRequestError(error.errors[0].message));
    }
    next(error);
  }
});

// POST /api/wallet/withdraw — Process withdrawal (requires 2FA)
router.post("/withdraw", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = withdrawSchema.parse(req.body);
    const result = await WalletService.processWithdrawal(
      req.user!.userId,
      data.amount,
      data.address,
      data.twoFaCode
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return next(new BadRequestError(error.errors[0].message));
    }
    next(error);
  }
});

// GET /api/wallet/transactions — Get transaction history
router.get("/transactions", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const type = req.query.type as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await WalletService.getTransactions(req.user!.userId, {
      type,
      page,
      limit,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/wallet/whitelist — Get whitelisted addresses
router.get("/whitelist", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await WalletService.getWhitelistedAddresses(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/wallet/whitelist — Add whitelist address
router.post("/whitelist", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { address, label } = req.body;
    if (!address) return next(new BadRequestError("Address is required"));
    const result = await WalletService.addWhitelistedAddress(req.user!.userId, address, label);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/wallet/whitelist/:id — Remove whitelist address
router.delete("/whitelist/:id", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await WalletService.removeWhitelistedAddress(req.user!.userId, req.params.id);
    res.json({ success: true, message: "Address removed" });
  } catch (error) {
    next(error);
  }
});

export default router;
