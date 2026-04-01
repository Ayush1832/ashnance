import { prisma } from "../utils/prisma";
import {
  BadRequestError,
  NotFoundError,
  InsufficientBalanceError,
} from "../utils/errors";

export class StakingService {
  /**
   * Get all active staking pools
   */
  static async getPools() {
    return prisma.stakingPool.findMany({
      where: { isActive: true },
      orderBy: { lockDays: "asc" },
    });
  }

  /**
   * Get user's staking positions
   */
  static async getPositions(userId: string) {
    const positions = await prisma.stakingPosition.findMany({
      where: { userId },
      include: { pool: true },
      orderBy: { createdAt: "desc" },
    });

    // Accrue pending rewards for active positions
    const now = new Date();
    return positions.map((pos) => {
      let pendingRewards = 0;
      if (pos.status === "ACTIVE") {
        const elapsedMs = now.getTime() - pos.lastRewardAt.getTime();
        const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
        const dailyRate = Number(pos.pool.apy) / 100 / 365;
        pendingRewards = Number(pos.amount) * dailyRate * elapsedDays;
      }
      return {
        ...pos,
        pendingRewards: Number(pos.rewardsEarned) + pendingRewards,
        isUnlocked: now >= pos.lockedUntil,
      };
    });
  }

  /**
   * Stake ASH tokens into a pool
   */
  static async stake(userId: string, poolId: string, amount: number) {
    const pool = await prisma.stakingPool.findUnique({ where: { id: poolId } });
    if (!pool || !pool.isActive) throw new NotFoundError("Pool not found or inactive");

    if (amount < Number(pool.minStake)) {
      throw new BadRequestError(`Minimum stake is ${pool.minStake} ASH`);
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError("Wallet not found");

    if (Number(wallet.ashBalance) < amount) {
      throw new InsufficientBalanceError("Insufficient ASH balance");
    }

    const lockedUntil = new Date(Date.now() + pool.lockDays * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx: any) => {
      // Deduct ASH from wallet
      await tx.wallet.update({
        where: { userId },
        data: { ashBalance: { decrement: amount } },
      });

      // Create staking position
      const position = await tx.stakingPosition.create({
        data: {
          userId,
          poolId,
          amount,
          lockedUntil,
          lastRewardAt: new Date(),
        },
        include: { pool: true },
      });

      // Log transaction
      await tx.transaction.create({
        data: {
          userId,
          type: "ASH_BOOST",
          amount,
          currency: "ASH",
          status: "COMPLETED",
          description: `Staked ${amount} ASH in ${pool.name} pool`,
          metadata: { poolId, positionId: position.id },
        },
      });

      return position;
    });

    return result;
  }

  /**
   * Claim accumulated rewards for a position
   */
  static async claimRewards(userId: string, positionId: string) {
    const position = await prisma.stakingPosition.findFirst({
      where: { id: positionId, userId, status: { in: ["ACTIVE", "UNLOCKED"] } },
      include: { pool: true },
    });
    if (!position) throw new NotFoundError("Staking position not found");

    const now = new Date();
    const elapsedMs = now.getTime() - position.lastRewardAt.getTime();
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
    const dailyRate = Number(position.pool.apy) / 100 / 365;
    const pendingRewards = Number(position.amount) * dailyRate * elapsedDays;

    if (pendingRewards < 0.01) {
      throw new BadRequestError("No rewards to claim yet (minimum 0.01 ASH)");
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // Credit rewards to wallet
      await tx.wallet.update({
        where: { userId },
        data: { ashBalance: { increment: pendingRewards } },
      });

      // Update position
      const updated = await tx.stakingPosition.update({
        where: { id: positionId },
        data: {
          rewardsEarned: { increment: pendingRewards },
          rewardsClaimed: { increment: pendingRewards },
          lastRewardAt: now,
          status: now >= position.lockedUntil ? "UNLOCKED" : "ACTIVE",
        },
        include: { pool: true },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: "ASH_BOOST",
          amount: pendingRewards,
          currency: "ASH",
          status: "COMPLETED",
          description: `Claimed ${pendingRewards.toFixed(2)} ASH rewards from ${position.pool.name}`,
          metadata: { positionId },
        },
      });

      return updated;
    });

    return { claimed: pendingRewards, position: result };
  }

  /**
   * Unstake (withdraw principal + any remaining rewards)
   */
  static async unstake(userId: string, positionId: string) {
    const position = await prisma.stakingPosition.findFirst({
      where: { id: positionId, userId, status: { in: ["ACTIVE", "UNLOCKED"] } },
      include: { pool: true },
    });
    if (!position) throw new NotFoundError("Staking position not found");

    const now = new Date();
    if (now < position.lockedUntil) {
      const daysLeft = Math.ceil(
        (position.lockedUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      throw new BadRequestError(
        `Position is still locked for ${daysLeft} more day(s). Unlock date: ${position.lockedUntil.toLocaleDateString()}`
      );
    }

    // Calculate final pending rewards
    const elapsedMs = now.getTime() - position.lastRewardAt.getTime();
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
    const dailyRate = Number(position.pool.apy) / 100 / 365;
    const finalRewards = Number(position.amount) * dailyRate * elapsedDays;
    const totalReturn = Number(position.amount) + finalRewards;

    const result = await prisma.$transaction(async (tx: any) => {
      // Return principal + final rewards
      await tx.wallet.update({
        where: { userId },
        data: { ashBalance: { increment: totalReturn } },
      });

      // Mark position as withdrawn
      const updated = await tx.stakingPosition.update({
        where: { id: positionId },
        data: {
          status: "WITHDRAWN",
          rewardsEarned: { increment: finalRewards },
          rewardsClaimed: { increment: finalRewards },
          lastRewardAt: now,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: "ASH_BOOST",
          amount: totalReturn,
          currency: "ASH",
          status: "COMPLETED",
          description: `Unstaked ${Number(position.amount)} ASH + ${finalRewards.toFixed(2)} ASH rewards from ${position.pool.name}`,
          metadata: { positionId },
        },
      });

      return updated;
    });

    return {
      principal: Number(position.amount),
      rewards: finalRewards,
      total: totalReturn,
      position: result,
    };
  }

  /**
   * Get staking summary stats for a user
   */
  static async getSummary(userId: string) {
    const positions = await prisma.stakingPosition.findMany({
      where: { userId, status: { in: ["ACTIVE", "UNLOCKED"] } },
      include: { pool: true },
    });

    const now = new Date();
    let totalStaked = 0;
    let totalPendingRewards = 0;

    for (const pos of positions) {
      totalStaked += Number(pos.amount);
      const elapsedMs = now.getTime() - pos.lastRewardAt.getTime();
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
      const dailyRate = Number(pos.pool.apy) / 100 / 365;
      totalPendingRewards += Number(pos.amount) * dailyRate * elapsedDays;
    }

    const allTime = await prisma.stakingPosition.aggregate({
      where: { userId },
      _sum: { rewardsClaimed: true },
    });

    return {
      totalStaked,
      totalPendingRewards,
      totalClaimedAllTime: Number(allTime._sum.rewardsClaimed ?? 0),
      activePositions: positions.length,
    };
  }

  /**
   * Seed default staking pools (called once on setup)
   */
  static async seedPools() {
    const pools = [
      { name: "EMBER POOL",   apy: 8.00,  lockDays: 7,  minStake: 100,  description: "Short-term staking with 7-day lock" },
      { name: "FLAME POOL",   apy: 15.00, lockDays: 30, minStake: 500,  description: "Medium-term staking with 30-day lock" },
      { name: "INFERNO POOL", apy: 30.00, lockDays: 90, minStake: 1000, description: "Long-term staking with 90-day lock and highest APY" },
    ];

    for (const pool of pools) {
      await prisma.stakingPool.upsert({
        where: { name: pool.name },
        update: {},
        create: pool,
      });
    }
  }
}
