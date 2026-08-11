import { prisma } from "../utils/prisma";
import { BadRequestError, InsufficientBalanceError, NotFoundError } from "../utils/errors";

export interface ContributionResult {
  contributionId: string;
  poolCurrentValue: number;
  participantWeight: number;
  creatorRevenue: number;
  platformFee: number;
  prizeAllocation: number;
}

export class CreatorContributionService {
  /**
   * Contribute USDC into a creator pool. Mirrors BurnService.executeBurn's
   * transactional-split pattern, but fully isolated from Round/Burn/RewardPool —
   * spends from the same in-app Wallet.usdcBalance burns use (no separate
   * deposit flow for pool contributions).
   */
  static async executeContribution(
    userId: string,
    poolId: string,
    amountUsdc: number
  ): Promise<ContributionResult> {
    const pool = await prisma.creatorPool.findUnique({ where: { id: poolId } });
    if (!pool) throw new NotFoundError("Pool not found");

    if (pool.status !== "ACTIVE") {
      throw new BadRequestError(`This pool is not accepting contributions (status: ${pool.status})`);
    }
    if (pool.endDate && pool.endDate < new Date()) {
      throw new BadRequestError("This pool has ended");
    }

    const min = Number(pool.minContribution);
    const max = pool.maxContribution ? Number(pool.maxContribution) : null;
    if (amountUsdc < min) {
      throw new BadRequestError(`Minimum contribution is $${min} USDC`);
    }
    if (max && amountUsdc > max) {
      throw new BadRequestError(`Maximum contribution is $${max} USDC`);
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { wallet: true } });
    if (!user || !user.wallet) throw new NotFoundError("User or wallet not found");
    if (user.isBanned) throw new BadRequestError("Your account has been suspended.");

    const platformFeePercent = Number(pool.platformFeePercent);
    const creatorRevenuePercent = Number(pool.creatorRevenuePercent);
    const platformFee = amountUsdc * platformFeePercent;
    const creatorRevenue = amountUsdc * creatorRevenuePercent;
    const prizeAllocation = amountUsdc - platformFee - creatorRevenue;

    let poolCurrentValue = 0;
    let participantWeight = 0;

    const contribution = await prisma.$transaction(async (tx: any) => {
      // Guarded debit — same TOCTOU-safe pattern as BurnService.executeBurn.
      const debit = await tx.wallet.updateMany({
        where: { userId, usdcBalance: { gte: amountUsdc } },
        data: { usdcBalance: { decrement: amountUsdc } },
      });
      if (debit.count === 0) {
        throw new InsufficientBalanceError(`Insufficient balance to contribute $${amountUsdc} USDC.`);
      }

      // Platform fee → existing ProfitPool (reuses owner withdrawal tooling).
      await tx.profitPool.updateMany({
        data: {
          balance: { increment: platformFee },
          totalDeposited: { increment: platformFee },
        },
      });

      // Creator revenue → CreatorWallet.
      await tx.creatorWallet.updateMany({
        where: { creatorId: pool.creatorId },
        data: {
          usdcBalance: { increment: creatorRevenue },
          totalEarned: { increment: creatorRevenue },
        },
      });

      // Prize allocation → pool value.
      const updatedPool = await tx.creatorPool.update({
        where: { id: poolId },
        data: { currentPoolValue: { increment: prizeAllocation } },
      });
      poolCurrentValue = Number(updatedPool.currentPoolValue);

      // Weight = cumulative prize-allocation contributed (simple base weight for
      // this phase — battle-system modifiers are additive on top, added later).
      const participant = await tx.creatorPoolParticipant.upsert({
        where: { poolId_userId: { poolId, userId } },
        create: {
          poolId,
          userId,
          weight: prizeAllocation,
          totalContributed: amountUsdc,
          contributionCount: 1,
        },
        update: {
          weight: { increment: prizeAllocation },
          totalContributed: { increment: amountUsdc },
          contributionCount: { increment: 1 },
          lastActivityAt: new Date(),
        },
      });
      participantWeight = Number(participant.weight);

      const contributionRecord = await tx.creatorPoolContribution.create({
        data: {
          poolId,
          userId,
          amountUsdc,
          prizeAllocation,
          creatorRevenue,
          platformFee,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: "POOL_CONTRIBUTION",
          amount: amountUsdc,
          currency: "USDC",
          status: "COMPLETED",
          description: `Contributed $${amountUsdc} USDC to pool "${pool.name}"`,
          metadata: { creatorPoolId: poolId, contributionId: contributionRecord.id },
        },
      });

      return contributionRecord;
    });

    return {
      contributionId: contribution.id,
      poolCurrentValue,
      participantWeight,
      creatorRevenue,
      platformFee,
      prizeAllocation,
    };
  }
}
