import { prisma } from "../utils/prisma";

export class LeaderboardService {
  /**
   * Get top winners by prize amount
   */
  static async getTopWinners(limit: number = 20) {
    const winners = await prisma.burn.groupBy({
      by: ["userId"],
      where: { isWinner: true },
      _sum: { prizeAmount: true },
      _count: { id: true },
      orderBy: { _sum: { prizeAmount: "desc" } },
      take: limit,
    });

    const userIds = winners.map((w) => w.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true, privacyMode: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return winners.map((w, index) => {
      const user = userMap.get(w.userId);
      return {
        rank: index + 1,
        username: user?.privacyMode ? "Anonymous" : user?.username || "Unknown",
        avatarUrl: user?.avatarUrl,
        totalWon: w._sum.prizeAmount || 0,
        winCount: w._count.id,
      };
    });
  }

  /**
   * Get top burners by total burns
   */
  static async getTopBurners(limit: number = 20) {
    const burners = await prisma.burn.groupBy({
      by: ["userId"],
      _sum: { amountUsdc: true },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    const userIds = burners.map((b) => b.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true, privacyMode: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return burners.map((b, index) => {
      const user = userMap.get(b.userId);
      return {
        rank: index + 1,
        username: user?.privacyMode ? "Anonymous" : user?.username || "Unknown",
        avatarUrl: user?.avatarUrl,
        totalBurned: b._sum.amountUsdc || 0,
        burnCount: b._count.id,
      };
    });
  }

  /**
   * Get top referrers
   */
  static async getTopReferrers(limit: number = 20) {
    const referrers = await prisma.referral.groupBy({
      by: ["referrerId"],
      _sum: { totalEarned: true },
      _count: { id: true },
      orderBy: { _sum: { totalEarned: "desc" } },
      take: limit,
    });

    const userIds = referrers.map((r) => r.referrerId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true, privacyMode: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return referrers.map((r, index) => {
      const user = userMap.get(r.referrerId);
      return {
        rank: index + 1,
        username: user?.privacyMode ? "Anonymous" : user?.username || "Unknown",
        totalEarned: r._sum.totalEarned || 0,
        referralCount: r._count.id,
      };
    });
  }

  /**
   * Get top ASH holders
   */
  static async getTopAshHolders(limit: number = 20) {
    const wallets = await prisma.wallet.findMany({
      orderBy: { ashBalance: "desc" },
      take: limit,
      include: {
        user: { select: { username: true, avatarUrl: true, privacyMode: true } },
      },
    });

    return wallets.map((w, index) => ({
      rank: index + 1,
      username: w.user.privacyMode ? "Anonymous" : w.user.username,
      avatarUrl: w.user.avatarUrl,
      ashBalance: w.ashBalance,
    }));
  }
}
