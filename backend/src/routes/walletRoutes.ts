import { Response, NextFunction, Router } from "express";
import { WalletService } from "../services/walletService";
import { depositSchema, withdrawSchema } from "../utils/validators";
import { authenticate, AuthRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/errors";
import { BlockchainService } from "../services/blockchainService";

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

// GET /api/wallet/platform-info — Returns master wallet address (public, no auth needed)
router.get("/platform-info", (_req, res: Response) => {
  res.json({
    success: true,
    data: {
      masterWallet: BlockchainService.getMasterWalletAddress(),
      usdcMint: BlockchainService.getUsdcMint(),
      network: process.env.USDC_MINT
        ? (process.env.USDC_MINT === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ? "mainnet-beta" : "devnet")
        : (process.env.NODE_ENV === "production" ? "mainnet-beta" : "devnet"),
    },
  });
});

// POST /api/wallet/deposit — Verify on-chain tx and credit balance
router.post("/deposit", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { txHash } = req.body;
    if (!txHash || typeof txHash !== "string") {
      return next(new BadRequestError("txHash is required"));
    }
    const result = await WalletService.verifyAndProcessDeposit(req.user!.userId, txHash);
    res.json({ success: true, data: result });
  } catch (error: any) {
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
    await WalletService.removeWhitelistedAddress(req.user!.userId, req.params.id as string);
    res.json({ success: true, message: "Address removed" });
  } catch (error) {
    next(error);
  }
});

// GET /api/wallet/onchain/:address — Get on-chain USDC balance for any Solana address
router.get("/onchain/:address", async (req, res: Response, next: NextFunction) => {
  try {
    const address = req.params.address as string;
    if (!BlockchainService.validateSolanaAddress(address)) {
      return next(new BadRequestError("Invalid Solana address"));
    }
    const usdcBalance = await BlockchainService.getUsdcBalance(address);
    res.json({ success: true, data: { address, usdcBalance } });
  } catch (error) {
    next(error);
  }
});

export default router;
