import { prisma } from "../utils/prisma";
import { config } from "../config";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../utils/errors";
import { BlockchainService } from "./blockchainService";

const BURN_CONFIG_KEYS = [
  "jackpot_prob", "jackpot_amount",
  "big_prob", "big_amount",
  "medium_prob", "medium_amount",
  "small_amount",
  "ash_reward_min", "ash_reward_max",
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
  ash_reward_min: 200,
  ash_reward_max: 500,
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

    // Execute on-chain transfers
    let txHash1: string | undefined;
    let txHash2: string | undefined;

    try {
      txHash1 = await BlockchainService.sendUsdcTransfer(
        request.owner1Wallet,
        Number(request.owner1Amount)
      );
      txHash2 = await BlockchainService.sendUsdcTransfer(
        request.owner2Wallet,
        Number(request.owner2Amount)
      );
    } catch (err: any) {
      throw new Error(`On-chain transfer failed: ${err.message}`);
    }

    // Update request + deduct from profit pool
    const [updatedRequest] = await prisma.$transaction([
      prisma.ownerWithdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: "EXECUTED",
          approverEmail,
          txHash1: txHash1 || null,
          txHash2: txHash2 || null,
          approvedAt: new Date(),
          executedAt: new Date(),
        },
      }),
      prisma.profitPool.updateMany({
        data: {
          balance: { decrement: Number(request.amount) },
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

  /** Save burn configuration to PlatformConfig */
  static async saveBurnConfig(updates: Record<string, number>) {
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
