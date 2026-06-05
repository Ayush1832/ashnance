import { prisma } from "../utils/prisma";
import { config } from "../config";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../utils/errors";
import { BlockchainService } from "./blockchainService";
import { EmailService } from "./emailService";

/** ASH token price in USD — used to convert burn value to ASH tokens on loss */
export const ASH_TOKEN_PRICE_USD = 0.01;

const BURN_CONFIG_KEYS = [
  "ash_reward_percent",
  "constant_factor",
  "reward_pool_split", "profit_pool_split", "referral_pool_split",
  "referral_commission",
  "min_burn_amount", "max_burn_amount",
  "base_unit",
  "boost_cost_ash",
  "boost_duration_ms",
  "vip_holy_fire_bonus",
  "prize_pool_target",
  "weight_cap",
  "referral_weight_cap_pct",
  "prize_safety_pct",
  "round_time_limit_hours",
  "anti_snipe_seconds",
  // Emission halving
  "emission_halving_threshold", // ASH emitted per halving interval (default 100M)
  "total_ash_emitted",          // running total — updated on every burn
  // Round automation
  "auto_round_creation",        // 1 = auto-create next round after end, 0 = manual
];

const BURN_CONFIG_DEFAULTS: Record<string, number> = {
  ash_reward_percent: 1.0,
  constant_factor: 100,
  reward_pool_split: 0.40,       // reduced from 0.50 — referral pool takes 0.20
  profit_pool_split: 0.40,       // reduced from 0.50
  referral_pool_split: 0.20,     // dedicated referral/reward budget
  referral_commission: 0.10,     // 10% of participation paid from referral pool
  min_burn_amount: 5.0,
  max_burn_amount: 10000,
  base_unit: 4.99,
  boost_cost_ash: 1000,
  boost_duration_ms: 3600000,
  vip_holy_fire_bonus: 0.50,
  prize_pool_target: 500,
  weight_cap: 300,
  referral_weight_cap_pct: 0.40,
  prize_safety_pct: 0.70,
  round_time_limit_hours: 24,
  anti_snipe_seconds: 10,
  emission_halving_threshold: 100_000_000, // 100M ASH per halving interval
  total_ash_emitted: 0,                    // updated on each burn
  auto_round_creation: 1,                  // enabled by default
};

export class OwnerService {
  /** Verify the calling user is an owner */
  static isOwner(email: string): boolean {
    return config.ownerEmails.includes(email);
  }

  /** Get or create the profit pool record */
  static async getProfitPool() {
    let pool = await prisma.profitPool.findFirst();
    if (!pool) {
      pool = await prisma.profitPool.create({ data: {} });
    }
    return pool;
  }

  /** Get or create the referral pool record */
  static async getReferralPool() {
    let pool = await prisma.referralPool.findFirst();
    if (!pool) {
      pool = await prisma.referralPool.create({ data: {} });
    }
    return pool;
  }

  /**
   * Compute the current emission multiplier based on total ASH emitted so far.
   * Halves every `emission_halving_threshold` ASH (default 100M).
   *   0 → 100M  = 1.0 (full rewards)
   *   100M → 200M = 0.5
   *   200M → 300M = 0.25
   *   etc.
   */
  static async getEmissionMultiplier(): Promise<number> {
    const cfg = await OwnerService.getBurnConfig();
    const totalEmitted = cfg.total_ash_emitted ?? 0;
    const threshold = cfg.emission_halving_threshold ?? 100_000_000;
    if (threshold <= 0) return 1;
    const halvings = Math.floor(totalEmitted / threshold);
    return 1 / Math.pow(2, halvings);
  }

  /** Get platform stats overview */
  static async getStats() {
    const [totalUsers, totalBurns, rewardPool, profitPool, activeVips] = await Promise.all([
      prisma.user.count(),
      prisma.burn.count(),
      prisma.rewardPool.findFirst(),
      OwnerService.getProfitPool(),
      prisma.user.count({ where: { isVip: true } }),
    ]);

    const burnAgg = await prisma.burn.aggregate({ _sum: { amountUsdc: true } });

    return {
      totalUsers,
      totalBurns,
      activeVips,
      totalBurned: Number(burnAgg._sum.amountUsdc ?? 0),
      rewardPoolBalance: Number(rewardPool?.totalBalance ?? 0),
      rewardPoolPaidOut: Number(rewardPool?.totalPaidOut ?? 0),
      profitPoolBalance: Number(profitPool.balance),
      profitPoolTotalDeposited: Number(profitPool.totalDeposited),
      profitPoolTotalWithdrawn: Number(profitPool.totalWithdrawn),
    };
  }

  /** Initiate a withdrawal request (first owner signs) */
  static async initiateWithdrawal(initiatorEmail: string) {
    if (!OwnerService.isOwner(initiatorEmail)) {
      throw new UnauthorizedError("Owner access required");
    }

    // Validate owner wallets are configured
    if (!config.owner1Wallet || !config.owner2Wallet) {
      throw new BadRequestError(
        "Owner wallets not configured. Set OWNER_1_WALLET and OWNER_2_WALLET in backend/.env before initiating a withdrawal."
      );
    }
    if (
      !BlockchainService.validateSolanaAddress(config.owner1Wallet) ||
      !BlockchainService.validateSolanaAddress(config.owner2Wallet)
    ) {
      throw new BadRequestError(
        "OWNER_1_WALLET or OWNER_2_WALLET in .env is not a valid Solana address."
      );
    }

    // Only 1 pending request at a time
    const existing = await prisma.ownerWithdrawalRequest.findFirst({
      where: { status: "PENDING" },
    });
    if (existing) {
      throw new BadRequestError("A withdrawal request is already pending approval");
    }

    const pool = await OwnerService.getProfitPool();
    const balance = Number(pool.balance);
    if (balance <= 0) {
      throw new BadRequestError("Profit pool is empty");
    }

    const owner1Amount = balance * 0.6;
    const owner2Amount = balance * 0.4;

    const request = await prisma.ownerWithdrawalRequest.create({
      data: {
        amount: balance,
        initiatorEmail,
        status: "PENDING",
        owner1Wallet: config.owner1Wallet,
        owner2Wallet: config.owner2Wallet,
        owner1Amount,
        owner2Amount,
      },
    });

    return request;
  }

  /** Second owner approves and executes the withdrawal */
  static async approveWithdrawal(approverEmail: string, requestId: string) {
    if (!OwnerService.isOwner(approverEmail)) {
      throw new UnauthorizedError("Owner access required");
    }

    const request = await prisma.ownerWithdrawalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundError("Withdrawal request not found");
    if (request.status !== "PENDING") throw new BadRequestError("Request is not pending");
    if (request.initiatorEmail === approverEmail) {
      throw new UnauthorizedError("The same owner cannot both initiate and approve a withdrawal");
    }

    const now = new Date();

    // Atomically claim the request before any on-chain send so a second
    // concurrent approval can't trigger a duplicate payout. `approvedAt` is null
    // until claimed, so it acts as the lock token (no schema/enum change needed).
    const claimed = await prisma.ownerWithdrawalRequest.updateMany({
      where: { id: requestId, status: "PENDING", approvedAt: null },
      data: { approverEmail, approvedAt: now },
    });
    if (claimed.count === 0) {
      throw new BadRequestError("Withdrawal request is already being processed or is no longer pending.");
    }

    // --- Transfer 1: owner1 (60%) ---
    let txHash1: string;
    try {
      txHash1 = await BlockchainService.sendUsdcTransfer(
        request.owner1Wallet,
        Number(request.owner1Amount)
      );
    } catch (err: any) {
      throw new Error(`Owner1 on-chain transfer failed — nothing was sent: ${err.message}`);
    }

    // Record txHash1 immediately so it's never lost (approverEmail/approvedAt
    // were already set atomically above when the request was claimed).
    await prisma.ownerWithdrawalRequest.update({
      where: { id: requestId },
      data: { txHash1 },
    });

    // --- Transfer 2: owner2 (40%) ---
    let txHash2: string;
    try {
      txHash2 = await BlockchainService.sendUsdcTransfer(
        request.owner2Wallet,
        Number(request.owner2Amount)
      );
    } catch (err: any) {
      // Owner1 already received their USDC. Mark as PARTIAL so it's visible
      // in the owner panel and requires manual resolution for owner2.
      await prisma.ownerWithdrawalRequest.update({
        where: { id: requestId },
        data: { status: "PARTIAL" },
      });
      // Deduct owner1's portion from profit pool so the balance reflects reality
      await prisma.profitPool.updateMany({
        data: {
          balance:        { decrement: Number(request.owner1Amount) },
          totalWithdrawn: { increment: Number(request.owner1Amount) },
        },
      });
      const criticalMsg = `Owner withdrawal PARTIAL: owner1 paid txHash=${txHash1}, owner2 transfer failed.\nrequestId=${requestId}\nerror=${err}`;
      console.error("[CRITICAL]", criticalMsg);
      EmailService.sendCriticalAlert("Owner withdrawal PARTIAL — owner2 not paid", criticalMsg).catch(() => {});
      throw new Error(
        `Owner1 (${request.owner1Wallet}) was paid (${txHash1}). ` +
        `Owner2 transfer failed — please send $${Number(request.owner2Amount).toFixed(2)} ` +
        `manually to ${request.owner2Wallet}.`
      );
    }

    // Both succeeded — finalize
    const [updatedRequest] = await prisma.$transaction([
      prisma.ownerWithdrawalRequest.update({
        where: { id: requestId },
        data: { status: "EXECUTED", txHash2, executedAt: now },
      }),
      prisma.profitPool.updateMany({
        data: {
          balance:        { decrement: Number(request.amount) },
          totalWithdrawn: { increment: Number(request.amount) },
        },
      }),
    ]);

    return updatedRequest;
  }

  /** Cancel a pending withdrawal request */
  static async cancelWithdrawal(callerEmail: string, requestId: string) {
    if (!OwnerService.isOwner(callerEmail)) {
      throw new UnauthorizedError("Owner access required");
    }

    const request = await prisma.ownerWithdrawalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundError("Withdrawal request not found");
    if (request.status !== "PENDING") throw new BadRequestError("Only PENDING requests can be cancelled");

    return prisma.ownerWithdrawalRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
    });
  }

  /** Get all withdrawal requests (recent 20) */
  static async getWithdrawals() {
    return prisma.ownerWithdrawalRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  /** Get burn configuration from PlatformConfig with defaults */
  static async getBurnConfig(): Promise<Record<string, number>> {
    const rows = await prisma.platformConfig.findMany({
      where: { key: { in: BURN_CONFIG_KEYS } },
    });

    const result: Record<string, number> = { ...BURN_CONFIG_DEFAULTS };
    for (const row of rows) {
      result[row.key] = parseFloat(String(row.value));
    }
    return result;
  }

  /**
   * Solvency check: compares on-chain master wallet USDC balance against
   * total platform liabilities (all user balances + reward pool + profit pool).
   */
  static async getSolvency() {
    const masterAddress = BlockchainService.getMasterWalletAddress();

    const [onChainUsdc, userBalanceAgg, rewardPool, profitPool] = await Promise.all([
      BlockchainService.getUsdcBalance(masterAddress),
      prisma.wallet.aggregate({ _sum: { usdcBalance: true } }),
      prisma.rewardPool.findFirst(),
      OwnerService.getProfitPool(),
    ]);

    const totalUserBalances = Number(userBalanceAgg._sum.usdcBalance ?? 0);
    const rewardPoolBalance  = Number(rewardPool?.totalBalance ?? 0);
    const profitPoolBalance  = Number(profitPool.balance);
    const totalLiabilities   = totalUserBalances + rewardPoolBalance + profitPoolBalance;
    const surplus            = onChainUsdc - totalLiabilities;
    const ratio              = totalLiabilities > 0 ? onChainUsdc / totalLiabilities : 1;

    return {
      masterWallet: masterAddress,
      onChainUsdc,
      totalLiabilities,
      breakdown: {
        userBalances: totalUserBalances,
        rewardPool:   rewardPoolBalance,
        profitPool:   profitPoolBalance,
      },
      surplus,
      ratio,                      // <1 = underfunded, >=1 = solvent
      solvent: surplus >= 0,
    };
  }

  /** Save burn configuration to PlatformConfig */
  static async saveBurnConfig(updates: Record<string, number>) {
    // Validate pool splits always sum to 1.0 (reward + profit + referral)
    const current = await OwnerService.getBurnConfig();
    const merged  = { ...current, ...updates };
    const splitSum =
      (merged.reward_pool_split ?? 0) +
      (merged.profit_pool_split ?? 0) +
      (merged.referral_pool_split ?? 0);
    if (Math.abs(splitSum - 1.0) > 0.001) {
      throw new BadRequestError(
        `reward_pool_split + profit_pool_split + referral_pool_split must equal 1.0 ` +
        `(got ${merged.reward_pool_split} + ${merged.profit_pool_split} + ${merged.referral_pool_split} = ${splitSum.toFixed(4)})`
      );
    }

    const ops = Object.entries(updates)
      .filter(([key]) => BURN_CONFIG_KEYS.includes(key))
      .map(([key, value]) =>
        prisma.platformConfig.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      );

    await prisma.$transaction(ops);
    return OwnerService.getBurnConfig();
  }
}
