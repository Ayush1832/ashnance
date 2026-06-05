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
      // Derived from the actual RPC connection so it always matches the mint the
      // frontend builds the deposit transaction with.
      network: BlockchainService.getNetwork(),
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
    // Solana tx signatures are base58, 87-88 characters
    if (!/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(txHash)) {
      return next(new BadRequestError("Invalid transaction hash format"));
    }
    const result = await WalletService.verifyAndProcessDeposit(req.user!.userId, txHash);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/wallet/deposit/recover — Scan recent master-wallet transfers and
// credit any of THIS user's deposits that were never reported by the client.
router.post("/deposit/recover", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await WalletService.recoverDeposits(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (error) {
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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await WalletService.getTransactions(req.user!.userId, {
      type,
      page,
      limit,
    });

    // Normalize legacy DB enum values to canonical frontend names
    const TX_TYPE_MAP: Record<string, string> = {
      WITHDRAWAL:      "WITHDRAW",
      REFERRAL_REWARD: "REFERRAL",
      VIP_PURCHASE:    "VIP",
      ASH_BOOST:       "BOOST",
    };

    // Map to frontend-expected shape
    const items = result.transactions.map((tx) => ({
      id:          tx.id,
      type:        TX_TYPE_MAP[tx.type] ?? tx.type,
      description: tx.description ?? tx.type,
      amount:      Number(tx.amount),
      asset:       tx.currency,
      status:      tx.status,
      at:          tx.createdAt,
      txHash:      tx.txHash ?? undefined,
    }));

    res.json({ success: true, data: { items, pagination: result.pagination } });
  } catch (error) {
    next(error);
  }
});

function formatWhitelistAddress(w: { id: string; address: string; label: string | null; activatesAt: Date | null }) {
  const now = new Date();
  const isActive = !w.activatesAt || w.activatesAt <= now;
  return {
    id:          w.id,
    address:     w.address,
    label:       w.label ?? undefined,
    status:      isActive ? "ACTIVE" : "PENDING",
    activatesAt: w.activatesAt?.toISOString() ?? undefined,
  };
}

// GET /api/wallet/whitelist — Get whitelisted addresses
router.get("/whitelist", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await WalletService.getWhitelistedAddresses(req.user!.userId);
    res.json({ success: true, data: result.map(formatWhitelistAddress) });
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
    res.json({ success: true, data: formatWhitelistAddress(result) });
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

// POST /api/wallet/claim-ash — Transfer ASH balance (full or partial) to user's on-chain wallet
// Body: { toAddress: string, amount?: number }
// If amount is omitted, claims the full in-app ASH balance.
router.post("/claim-ash", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { toAddress, amount } = req.body;
    if (!toAddress || typeof toAddress !== "string") {
      return next(new BadRequestError("toAddress is required"));
    }
    const parsedAmount = amount !== undefined ? Number(amount) : undefined;
    if (parsedAmount !== undefined && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      return next(new BadRequestError("amount must be a positive number"));
    }
    const result = await WalletService.claimAsh(req.user!.userId, toAddress, parsedAmount);
    res.json({ success: true, data: result });
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
