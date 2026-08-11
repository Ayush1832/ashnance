import { prisma } from "../utils/prisma";
import { config } from "../config";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InsufficientBalanceError,
  NotFoundError,
} from "../utils/errors";

export interface CreatePoolInput {
  slug: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  logoUrl?: string;
  minContribution: number;
  maxContribution?: number;
  creatorRevenuePercent: number;
  rolloverUnusedFunds?: boolean;
  numberOfWinners?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdatePoolInput {
  name?: string;
  description?: string;
  coverImageUrl?: string;
  logoUrl?: string;
  minContribution?: number;
  maxContribution?: number;
  creatorRevenuePercent?: number;
  rolloverUnusedFunds?: boolean;
  endDate?: string;
}

const MUTABLE_STATUSES = new Set(["DRAFT", "PAUSED"]);

export class CreatorPoolService {
  static async createPool(creatorId: string, input: CreatePoolInput) {
    if (input.creatorRevenuePercent > config.creatorPools.maxCreatorRevenuePercent) {
      throw new BadRequestError(
        `Creator revenue cannot exceed ${config.creatorPools.maxCreatorRevenuePercent * 100}%`
      );
    }
    if (input.maxContribution && input.maxContribution < input.minContribution) {
      throw new BadRequestError("maxContribution cannot be less than minContribution");
    }

    const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
    if (!creator) throw new NotFoundError("Creator not found");

    const slugTaken = await prisma.creatorPool.findUnique({
      where: { creatorId_slug: { creatorId, slug: input.slug } },
    });
    if (slugTaken) throw new ConflictError("You already have a pool with that URL slug.");

    // Verified creators go straight ACTIVE (auto-live, no per-pool admin approval).
    // Unverified creators get a DRAFT they can't activate until admin verifies them.
    const status = creator.verified ? "ACTIVE" : "DRAFT";

    return prisma.$transaction(async (tx: any) => {
      await this.chargeCreationFee(tx, creator.userId, input.name);

      return tx.creatorPool.create({
        data: {
          creatorId,
          slug: input.slug,
          name: input.name,
          description: input.description,
          coverImageUrl: input.coverImageUrl,
          logoUrl: input.logoUrl,
          minContribution: input.minContribution,
          maxContribution: input.maxContribution,
          creatorRevenuePercent: input.creatorRevenuePercent,
          platformFeePercent: config.creatorPools.defaultPlatformFeePercent,
          rolloverUnusedFunds: input.rolloverUnusedFunds ?? false,
          numberOfWinners: input.numberOfWinners ?? 1,
          startDate: input.startDate ? new Date(input.startDate) : new Date(),
          endDate: input.endDate ? new Date(input.endDate) : null,
          status,
        },
      });
    });
  }

  /**
   * Flat one-time USDC fee for opening a pool (createPool or duplicatePool) —
   * debited from the creator's own Wallet.usdcBalance, routed into ProfitPool
   * alongside the per-contribution platform fee. Guarded updateMany keeps the
   * debit TOCTOU-safe, same pattern as CreatorContributionService.
   *
   * Admins/owners are exempt — same gate as requireAdmin (role === "ADMIN" or
   * email in config.ownerEmails) — since pools they open aren't a paying
   * creator's product, they're platform-run.
   */
  private static async chargeCreationFee(tx: any, creatorUserId: string, poolName: string) {
    const fee = config.creatorPools.poolCreationFeeUsdc;
    if (fee <= 0) return;

    const user = await tx.user.findUnique({ where: { id: creatorUserId }, select: { role: true, email: true } });
    const isAdminOrOwner = user && (user.role === "ADMIN" || config.ownerEmails.includes(user.email));
    if (isAdminOrOwner) return;

    const debit = await tx.wallet.updateMany({
      where: { userId: creatorUserId, usdcBalance: { gte: fee } },
      data: { usdcBalance: { decrement: fee } },
    });
    if (debit.count === 0) {
      throw new InsufficientBalanceError(
        `Insufficient balance to open a pool — a $${fee} USDC creation fee is required.`
      );
    }

    await tx.profitPool.updateMany({
      data: {
        balance: { increment: fee },
        totalDeposited: { increment: fee },
      },
    });

    await tx.transaction.create({
      data: {
        userId: creatorUserId,
        type: "POOL_CREATION_FEE",
        amount: fee,
        currency: "USDC",
        status: "COMPLETED",
        description: `Paid $${fee} USDC pool creation fee for "${poolName}"`,
      },
    });
  }

  static async updatePool(creatorId: string, poolId: string, input: UpdatePoolInput) {
    const pool = await this.assertOwnership(creatorId, poolId);
    if (!MUTABLE_STATUSES.has(pool.status)) {
      throw new BadRequestError(`Cannot edit a pool while it is ${pool.status}`);
    }
    if (
      input.creatorRevenuePercent != null &&
      input.creatorRevenuePercent > config.creatorPools.maxCreatorRevenuePercent
    ) {
      throw new BadRequestError(
        `Creator revenue cannot exceed ${config.creatorPools.maxCreatorRevenuePercent * 100}%`
      );
    }

    return prisma.creatorPool.update({
      where: { id: poolId },
      data: {
        ...input,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      },
    });
  }

  static async pausePool(creatorId: string, poolId: string) {
    const pool = await this.assertOwnership(creatorId, poolId);
    if (pool.status !== "ACTIVE") {
      throw new BadRequestError("Only an active pool can be paused");
    }
    return prisma.creatorPool.update({ where: { id: poolId }, data: { status: "PAUSED" } });
  }

  static async resumePool(creatorId: string, poolId: string) {
    const pool = await this.assertOwnership(creatorId, poolId);
    if (pool.status !== "PAUSED") {
      throw new BadRequestError("Only a paused pool can be resumed");
    }
    return prisma.creatorPool.update({ where: { id: poolId }, data: { status: "ACTIVE" } });
  }

  static async archivePool(creatorId: string, poolId: string) {
    const pool = await this.assertOwnership(creatorId, poolId);
    if (pool.status !== "ENDED" && pool.status !== "PAUSED" && pool.status !== "DRAFT") {
      throw new BadRequestError("Only an ended, paused, or draft pool can be archived");
    }
    return prisma.creatorPool.update({
      where: { id: poolId },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });
  }

  /**
   * Clone a pool's config into a fresh DRAFT. Does not copy contributions,
   * participants, or winners. If the source pool has rolloverUnusedFunds set
   * and unspent value, seed the new pool's currentPoolValue with it.
   */
  static async duplicatePool(creatorId: string, poolId: string, newSlug: string) {
    const pool = await this.assertOwnership(creatorId, poolId);

    const slugTaken = await prisma.creatorPool.findUnique({
      where: { creatorId_slug: { creatorId, slug: newSlug } },
    });
    if (slugTaken) throw new ConflictError("You already have a pool with that URL slug.");

    const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
    if (!creator) throw new NotFoundError("Creator not found");
    const status = creator.verified ? "ACTIVE" : "DRAFT";

    return prisma.$transaction(async (tx: any) => {
      let rolloverAmount = 0;
      if (pool.rolloverUnusedFunds && pool.status === "ENDED" && Number(pool.currentPoolValue) > 0) {
        // Atomically claim the rollover amount by zeroing it in the same
        // transaction — a concurrent duplicatePool call (double-click, retry)
        // racing on the same source pool will find currentPoolValue already 0
        // and claim nothing, instead of both calls seeding a full copy of the
        // same value into two different new pools.
        const claimed = await tx.creatorPool.updateMany({
          where: { id: poolId, currentPoolValue: { gt: 0 } },
          data: { currentPoolValue: 0 },
        });
        if (claimed.count > 0) {
          rolloverAmount = Number(pool.currentPoolValue);
        }
      }

      await this.chargeCreationFee(tx, creator.userId, pool.name);

      return tx.creatorPool.create({
        data: {
          creatorId,
          slug: newSlug,
          name: pool.name,
          description: pool.description,
          coverImageUrl: pool.coverImageUrl,
          logoUrl: pool.logoUrl,
          minContribution: pool.minContribution,
          maxContribution: pool.maxContribution,
          creatorRevenuePercent: pool.creatorRevenuePercent,
          platformFeePercent: config.creatorPools.defaultPlatformFeePercent,
          rolloverUnusedFunds: pool.rolloverUnusedFunds,
          numberOfWinners: pool.numberOfWinners,
          currentPoolValue: rolloverAmount,
          status,
        },
      });
    });
  }

  /**
   * End a pool and pay out the prize. Winner selection follows the Weight
   * philosophy (same as the Global Pool): the top `numberOfWinners` participants
   * by weight win, sharing currentPoolValue proportionally to their weight.
   * Fully isolated from RoundService.endRound — no shared tables, no shared payout path.
   */
  static async endPool(creatorId: string, poolId: string) {
    const pool = await this.assertOwnership(creatorId, poolId);
    if (pool.status !== "ACTIVE" && pool.status !== "PAUSED") {
      throw new BadRequestError(`Only an active or paused pool can be ended (current: ${pool.status})`);
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // Atomically claim the end — only one concurrent endPool call (e.g. a
      // double-click) can flip status out of ACTIVE/PAUSED. A second call that
      // races in here finds count === 0 and aborts before computing any payout,
      // so the pool's value can never be paid out twice.
      const claimed = await tx.creatorPool.updateMany({
        where: { id: poolId, status: { in: ["ACTIVE", "PAUSED"] } },
        data: { status: "ENDED", endedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new BadRequestError("This pool has already been ended.");
      }

      const freshPool = await tx.creatorPool.findUnique({ where: { id: poolId } });
      const topParticipants = await tx.creatorPoolParticipant.findMany({
        where: { poolId, weight: { gt: 0 } },
        orderBy: { weight: "desc" },
        take: freshPool.numberOfWinners,
      });

      const poolValue = Number(freshPool.currentPoolValue);
      const totalWeight = topParticipants.reduce((s: number, p: any) => s + Number(p.weight), 0);

      const winners: { userId: string; prizeAmount: number }[] = [];

      if (topParticipants.length > 0 && poolValue > 0 && totalWeight > 0) {
        for (const participant of topParticipants) {
          const share = Number(participant.weight) / totalWeight;
          const prizeAmount = poolValue * share;
          if (prizeAmount <= 0) continue;

          await tx.wallet.updateMany({
            where: { userId: participant.userId },
            data: { usdcBalance: { increment: prizeAmount } },
          });
          await tx.creatorPoolWinner.create({
            data: { poolId, userId: participant.userId, prizeAmount },
          });
          await tx.transaction.create({
            data: {
              userId: participant.userId,
              type: "POOL_PRIZE",
              amount: prizeAmount,
              currency: "USDC",
              status: "COMPLETED",
              description: `Won $${prizeAmount.toFixed(2)} USDC in pool "${pool.name}"`,
              metadata: { creatorPoolId: poolId },
            },
          });
          winners.push({ userId: participant.userId, prizeAmount });
        }
      }

      // Decrement by exactly the amount paid out (not an absolute reset to 0) so
      // any contribution that lands concurrently, between the read above and this
      // commit, is preserved in the pool's balance instead of being silently wiped.
      // status/endedAt were already set atomically by the claim above.
      const paidOut = winners.reduce((s, w) => s + w.prizeAmount, 0);
      const updatedPool =
        paidOut > 0
          ? await tx.creatorPool.update({
              where: { id: poolId },
              data: { currentPoolValue: { decrement: paidOut } },
            })
          : freshPool;

      return { pool: updatedPool, winners };
    });

    return result;
  }

  static async listCreatorPools(creatorId: string) {
    return prisma.creatorPool.findMany({
      where: { creatorId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getPoolBySlug(creatorSlug: string, poolSlug: string) {
    const creator = await prisma.creator.findUnique({ where: { slug: creatorSlug } });
    if (!creator) throw new NotFoundError("Creator not found");

    const pool = await prisma.creatorPool.findUnique({
      where: { creatorId_slug: { creatorId: creator.id, slug: poolSlug } },
    });
    if (!pool) throw new NotFoundError("Pool not found");

    const [participants, winners] = await Promise.all([
      prisma.creatorPoolParticipant.findMany({
        where: { poolId: pool.id },
        orderBy: { weight: "desc" },
        take: 50,
        include: { user: { select: { username: true, avatarUrl: true } } },
      }),
      prisma.creatorPoolWinner.findMany({
        where: { poolId: pool.id },
        orderBy: { selectedAt: "desc" },
        include: { user: { select: { username: true } } },
      }),
    ]);

    return { creator, pool, participants, winners };
  }

  static async assertOwnership(creatorId: string, poolId: string) {
    const pool = await prisma.creatorPool.findUnique({ where: { id: poolId } });
    if (!pool) throw new NotFoundError("Pool not found");
    if (pool.creatorId !== creatorId) throw new ForbiddenError("You do not own this pool");
    return pool;
  }
}
