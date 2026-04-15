import { prisma } from "../utils/prisma";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { OwnerService } from "./ownerService";

export interface RoundLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  cumulativeWeight: number;
  distanceToFirst: number; // req #9: how much weight behind rank #1
}

export class RoundService {
  /**
   * Create a new ACTIVE round. Only one active round is allowed at a time.
   * prizePoolTarget: USDC amount the reward-pool share must reach to trigger winner selection.
   * timeLimitHours: optional time limit; round auto-ends after this many hours even if target not reached.
   */
  static async createRound(prizePoolTarget: number, timeLimitHours?: number): Promise<object> {
    const existing = await prisma.round.findFirst({ where: { status: "ACTIVE" } });
    if (existing) {
      throw new BadRequestError(
        `Round #${existing.roundNumber} is already active. End it before starting a new one.`
      );
    }

    const lastRound = await prisma.round.findFirst({ orderBy: { roundNumber: "desc" } });
    const roundNumber = (lastRound?.roundNumber ?? 0) + 1;

    // req #6 — Round time limit
    const limitHours = timeLimitHours ?? null;
    const endsAt = limitHours ? new Date(Date.now() + limitHours * 3600 * 1000) : null;

    return prisma.round.create({
      data: {
        roundNumber,
        prizePoolTarget,
        currentPool: 0,
        status: "ACTIVE",
        timeLimitHours: limitHours,
        endsAt,
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
   * Get full ranking for a specific round sorted by cumulativeWeight descending.
   * Returns top 10 entries, each with distanceToFirst (req #9).
   */
  static async getRoundLeaderboard(roundId: string): Promise<RoundLeaderboardEntry[]> {
    const burns = await prisma.burn.findMany({
      where: { roundId },
      select: { userId: true, finalWeight: true },
    });

    const weightMap = new Map<string, number>();
    for (const b of burns) {
      weightMap.set(b.userId, (weightMap.get(b.userId) ?? 0) + Number(b.finalWeight));
    }

    if (weightMap.size === 0) return [];

    const userIds = [...weightMap.keys()];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });

    const sorted = users
      .map((u) => ({
        rank: 0,
        userId: u.id,
        username: u.username,
        cumulativeWeight: weightMap.get(u.id) ?? 0,
        distanceToFirst: 0,
      }))
      .sort((a, b) => b.cumulativeWeight - a.cumulativeWeight);

    const firstWeight = sorted[0]?.cumulativeWeight ?? 0;

    return sorted
      .slice(0, 10)
      .map((e, i) => ({
        ...e,
        rank: i + 1,
        distanceToFirst: firstWeight - e.cumulativeWeight,
      }));
  }

  /**
   * Get full ranking (all participants) for a round.
   * Used internally by endRound and getActiveRoundStatus for user-rank lookup.
   */
  private static async getFullRanking(roundId: string): Promise<RoundLeaderboardEntry[]> {
    const burns = await prisma.burn.findMany({
      where: { roundId },
      select: { userId: true, finalWeight: true },
    });

    const weightMap = new Map<string, number>();
    for (const b of burns) {
      weightMap.set(b.userId, (weightMap.get(b.userId) ?? 0) + Number(b.finalWeight));
    }

    if (weightMap.size === 0) return [];

    const userIds = [...weightMap.keys()];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });

    const sorted = users
      .map((u) => ({
        rank: 0,
        userId: u.id,
        username: u.username,
        cumulativeWeight: weightMap.get(u.id) ?? 0,
        distanceToFirst: 0,
      }))
      .sort((a, b) => b.cumulativeWeight - a.cumulativeWeight);

    const firstWeight = sorted[0]?.cumulativeWeight ?? 0;

    return sorted.map((e, i) => ({
      ...e,
      rank: i + 1,
      distanceToFirst: firstWeight - e.cumulativeWeight,
    }));
  }

  /**
   * Get the current leaderboard for the active round, plus the calling user's rank.
   * req #9: includes distance to #1 for each entry and for the calling user.
   */
  static async getActiveRoundStatus(userId?: string) {
    const round = await RoundService.getActiveRound();
    if (!round) {
      return { round: null, leaderboard: [], userRank: null, userWeight: 0, userDistanceToFirst: null };
    }

    const leaderboard = await RoundService.getRoundLeaderboard(round.id);

    let userRank: number | null = null;
    let userWeight = 0;
    let userDistanceToFirst: number | null = null;

    if (userId) {
      const entry = leaderboard.find((e) => e.userId === userId);
      if (entry) {
        userRank = entry.rank;
        userWeight = entry.cumulativeWeight;
        userDistanceToFirst = entry.distanceToFirst;
      } else {
        // User may be ranked outside top 10 — do full ranking lookup
        const fullRanking = await RoundService.getFullRanking(round.id);
        const fullEntry = fullRanking.find((e) => e.userId === userId);
        if (fullEntry) {
          userRank = fullEntry.rank;
          userWeight = fullEntry.cumulativeWeight;
          userDistanceToFirst = fullEntry.distanceToFirst;
        }
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
        endsAt: round.endsAt,       // req #6: time limit deadline
        timeLimitHours: round.timeLimitHours,
      },
      leaderboard,
      userRank,
      userWeight,
      userDistanceToFirst, // req #9: distance to rank #1
    };
  }

  /**
   * End a round by paying the prize to the #1 ranked eligible user.
   * Called automatically when currentPool >= prizePoolTarget, when time limit expires, or manually by an owner.
   *
   * @param force - skip anti-snipe check (used for time-limit expiry and owner force-end)
   */
  static async endRound(roundId: string, force = false): Promise<{
    winner: { userId: string; username: string };
    prizeAmount: number;
    roundNumber: number;
  }> {
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundError("Round not found");
    if (round.status !== "ACTIVE") {
      throw new BadRequestError(`Round is already ${round.status.toLowerCase()}`);
    }

    const burnCfg = await OwnerService.getBurnConfig();

    const fullRanking = await RoundService.getFullRanking(roundId);
    if (fullRanking.length === 0) {
      await prisma.round.update({
        where: { id: roundId },
        data: { status: "CANCELLED", endedAt: new Date() },
      });
      throw new BadRequestError("No participants in round — round cancelled");
    }

    // req #8 — Anti-snipe protection (skipped for force-end)
    if (!force) {
      const antiSnipeSeconds = burnCfg.anti_snipe_seconds ?? 10;
      if (round.rank1SinceAt) {
        const heldMs = Date.now() - new Date(round.rank1SinceAt).getTime();
        if (heldMs < antiSnipeSeconds * 1000) {
          throw new BadRequestError(
            `Anti-snipe protection active: rank #1 must hold position for ${antiSnipeSeconds}s ` +
            `(held for ${(heldMs / 1000).toFixed(1)}s). Try again shortly.`
          );
        }
      }
    }

    // req #5 — Anti-domination cooldown: skip a winner who won the previous round
    let winner = fullRanking[0];
    const winnerUser = await prisma.user.findUnique({
      where: { id: winner.userId },
      select: { lastWonRoundId: true },
    });
    if (winnerUser?.lastWonRoundId) {
      const lastWonRound = await prisma.round.findUnique({
        where: { id: winnerUser.lastWonRoundId },
        select: { roundNumber: true },
      });
      if (lastWonRound && lastWonRound.roundNumber === round.roundNumber - 1) {
        // Rank #1 is on cooldown — use rank #2 if available
        if (fullRanking.length >= 2) {
          winner = fullRanking[1];
        } else {
          throw new BadRequestError(
            "Anti-domination cooldown: rank #1 won the previous round and no other eligible participant exists."
          );
        }
      }
    }

    // req #7 — Prize safety limit: prize ≤ 70% of reward pool balance
    const prizeSafetyPct = burnCfg.prize_safety_pct ?? 0.70;
    const rewardPool = await prisma.rewardPool.findFirst();
    const rewardPoolBalance = Number(rewardPool?.totalBalance ?? 0);
    const maxSafePrize = rewardPoolBalance * prizeSafetyPct;
    const prizeAmount = Math.min(Number(round.currentPool), maxSafePrize);

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

      // 4. Log WIN transaction
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

      // 5. req #2 — Winner reset: winner's cumulativeWeight → 0
      await tx.wallet.update({
        where: { userId: winner.userId },
        data: { cumulativeWeight: 0 },
      });

      // 6. req #1 — Soft reset: all other wallets × 0.90
      await tx.$executeRaw`
        UPDATE wallets
        SET "cumulativeWeight" = "cumulativeWeight" * 0.90
        WHERE "userId" != ${winner.userId}
      `;

      // 7. req #5 — Record winner for anti-domination cooldown
      await tx.user.update({
        where: { id: winner.userId },
        data: { lastWonRoundId: roundId },
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

  /**
   * req #6 — Check for and auto-end any rounds whose time limit has expired.
   * Called by the background scheduler in server.ts.
   */
  static async autoEndExpiredRounds(): Promise<void> {
    const expiredRounds = await prisma.round.findMany({
      where: {
        status: "ACTIVE",
        endsAt: { lte: new Date() },
      },
    });

    for (const round of expiredRounds) {
      try {
        await RoundService.endRound(round.id, true /* force — skip anti-snipe */);
        console.log(`[ROUND] Auto-ended time-expired round #${round.roundNumber}`);
      } catch (err: any) {
        // e.g. no participants → cancelled, or other transient error
        console.warn(`[ROUND] Failed to auto-end round #${round.roundNumber}: ${err.message}`);
      }
    }
  }
}
