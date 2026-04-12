import { prisma } from "../utils/prisma";
import { BadRequestError, NotFoundError } from "../utils/errors";

export interface RoundLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  cumulativeWeight: number;
}

export class RoundService {
  /**
   * Create a new ACTIVE round. Only one active round is allowed at a time.
   * prizePoolTarget: USDC amount the reward-pool share must reach to trigger winner selection.
   */
  static async createRound(prizePoolTarget: number): Promise<object> {
    const existing = await prisma.round.findFirst({ where: { status: "ACTIVE" } });
    if (existing) {
      throw new BadRequestError(
        `Round #${existing.roundNumber} is already active. End it before starting a new one.`
      );
    }

    const lastRound = await prisma.round.findFirst({ orderBy: { roundNumber: "desc" } });
    const roundNumber = (lastRound?.roundNumber ?? 0) + 1;

    return prisma.round.create({
      data: {
        roundNumber,
        prizePoolTarget,
        currentPool: 0,
        status: "ACTIVE",
      },
    });
  }

  /**
   * Get the currently active round, or null if none.
   */
  static async getActiveRound() {
    return prisma.round.findFirst({ where: { status: "ACTIVE" } });
  }

  /**
   * Get top-10 leaderboard for a specific round, sorted by cumulativeWeight descending.
   * The leaderboard is built from all users who burned during this round.
   */
  static async getRoundLeaderboard(roundId: string): Promise<RoundLeaderboardEntry[]> {
    // Get distinct userIds who burned in this round with their weights
    const burns = await prisma.burn.findMany({
      where: { roundId },
      select: { userId: true, finalWeight: true },
    });

    // Sum finalWeight per user for this round
    const weightMap = new Map<string, number>();
    for (const b of burns) {
      weightMap.set(b.userId, (weightMap.get(b.userId) ?? 0) + Number(b.finalWeight));
    }

    if (weightMap.size === 0) return [];

    const userIds = [...weightMap.keys()];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, wallet: { select: { cumulativeWeight: true } } },
    });

    const entries = users
      .map((u) => ({
        rank: 0,
        userId: u.id,
        username: u.username,
        // Use per-round burn weight for ranking (weight accumulated THIS round)
        cumulativeWeight: weightMap.get(u.id) ?? 0,
      }))
      .sort((a, b) => b.cumulativeWeight - a.cumulativeWeight)
      .slice(0, 10)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    return entries;
  }

  /**
   * Get the current leaderboard for the active round, plus the calling user's rank.
   */
  static async getActiveRoundStatus(userId?: string) {
    const round = await RoundService.getActiveRound();
    if (!round) {
      return { round: null, leaderboard: [], userRank: null, userWeight: 0 };
    }

    const leaderboard = await RoundService.getRoundLeaderboard(round.id);

    let userRank: number | null = null;
    let userWeight = 0;
    if (userId) {
      const entry = leaderboard.find((e) => e.userId === userId);
      if (entry) {
        userRank = entry.rank;
        userWeight = entry.cumulativeWeight;
      } else {
        // User hasn't burned yet this round — not ranked
        userRank = null;
        userWeight = 0;
      }
    }

    return {
      round: {
        id: round.id,
        roundNumber: round.roundNumber,
        status: round.status,
        prizePoolTarget: Number(round.prizePoolTarget),
        currentPool: Number(round.currentPool),
        progressPercent: Math.min(
          100,
          (Number(round.currentPool) / Number(round.prizePoolTarget)) * 100
        ),
        startedAt: round.startedAt,
      },
      leaderboard,
      userRank,
      userWeight,
    };
  }

  /**
   * End a round by paying the prize to the #1 ranked user.
   * Called automatically when currentPool >= prizePoolTarget, or manually by an owner.
   */
  static async endRound(roundId: string): Promise<{
    winner: { userId: string; username: string };
    prizeAmount: number;
    roundNumber: number;
  }> {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError("Round not found");
    if (round.status !== "ACTIVE") {
      throw new BadRequestError(`Round is already ${round.status.toLowerCase()}`);
    }

    const leaderboard = await RoundService.getRoundLeaderboard(roundId);
    if (leaderboard.length === 0) {
      // No participants — cancel the round
      await prisma.round.update({
        where: { id: roundId },
        data: { status: "CANCELLED", endedAt: new Date() },
      });
      throw new BadRequestError("No participants in round — round cancelled");
    }

    const winner = leaderboard[0];
    const prizeAmount = Number(round.currentPool);

    await prisma.$transaction(async (tx: any) => {
      // 1. Mark round complete
      await tx.round.update({
        where: { id: roundId },
        data: {
          status: "COMPLETED",
          winnerId: winner.userId,
          prizeAmount,
          endedAt: new Date(),
        },
      });

      // 2. Credit winner
      await tx.wallet.update({
        where: { userId: winner.userId },
        data: { usdcBalance: { increment: prizeAmount } },
      });

      // 3. Deduct from reward pool
      await tx.rewardPool.updateMany({
        data: {
          totalBalance: { decrement: prizeAmount },
          totalPaidOut: { increment: prizeAmount },
        },
      });

      // 4. Log the WIN transaction
      await tx.transaction.create({
        data: {
          userId: winner.userId,
          type: "WIN",
          amount: prizeAmount,
          currency: "USDC",
          status: "COMPLETED",
          description: `Round #${round.roundNumber} winner — prize $${prizeAmount.toFixed(2)} USDC`,
        },
      });
    });

    return { winner, prizeAmount, roundNumber: round.roundNumber };
  }

  /**
   * Cancel an active round without paying a prize (owner-only emergency action).
   */
  static async cancelRound(roundId: string): Promise<object> {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError("Round not found");
    if (round.status !== "ACTIVE") {
      throw new BadRequestError(`Round is already ${round.status.toLowerCase()}`);
    }

    return prisma.round.update({
      where: { id: roundId },
      data: { status: "CANCELLED", endedAt: new Date() },
    });
  }

  /**
   * Get completed/recent rounds for history display.
   */
  static async getRoundHistory(limit = 10) {
    return prisma.round.findMany({
      where: { status: { not: "ACTIVE" } },
      orderBy: { roundNumber: "desc" },
      take: limit,
      include: {
        winner: { select: { username: true } },
      },
    });
  }
}
