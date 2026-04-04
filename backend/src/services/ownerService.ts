import { prisma } from "../utils/prisma";
import { config } from "../config";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../utils/errors";
import { BlockchainService } from "./blockchainService";

/** ASH token price in USD — used to convert burn value to ASH tokens on loss */
export const ASH_TOKEN_PRICE_USD = 0.01;

const BURN_CONFIG_KEYS = [
  "jackpot_prob", "jackpot_amount",
  "big_prob", "big_amount",
  "medium_prob", "medium_amount",
  "small_amount",
  "ash_reward_percent", // % of burn value returned as ASH on loss (e.g. 1.0 = 100%)
  "constant_factor",
  "reward_pool_split", "profit_pool_split",
  "referral_commission",
];

const BURN_CONFIG_DEFAULTS: Record<string, number> = {
  jackpot_prob: 0.01,
  jackpot_amount: 2500,
  big_prob: 0.05,
  big_amount: 500,
  medium_prob: 0.20,
  medium_amount: 200,
  small_amount: 50,
  // burn $1 → lose → 100 ASH ($1 at $0.01/ASH)
  ash_reward_percent: 1.0,
  constant_factor: 100,
  reward_pool_split: 0.5,
  profit_pool_split: 0.5,
  referral_commission: 0.1,
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

    // Record txHash1 immediately so it's never lost
    await prisma.ownerWithdrawalRequest.update({
      where: { id: requestId },
      data: { txHash1, approverEmail, approvedAt: now },
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
      console.error(
        `[CRITICAL] Owner withdrawal PARTIAL: owner1 paid txHash=${txHash1}, ` +
        `owner2 transfer failed. requestId=${requestId}`,
        err
      );
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
    // Validate pool splits always sum to 1.0
    const current = await OwnerService.getBurnConfig();
    const merged  = { ...current, ...updates };
    const splitSum = (merged.reward_pool_split ?? 0) + (merged.profit_pool_split ?? 0);
    if (Math.abs(splitSum - 1.0) > 0.001) {
      throw new BadRequestError(
        `reward_pool_split (${merged.reward_pool_split}) + profit_pool_split (${merged.profit_pool_split}) must equal 1.0`
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
