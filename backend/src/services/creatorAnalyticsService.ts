import { prisma } from "../utils/prisma";
import { CreatorPoolService } from "./creatorPoolService";

export class CreatorAnalyticsService {
  /**
   * Pool-level analytics for the creator dashboard. Note: "conversion rate" from
   * the original feature spec is intentionally omitted — this platform has no
   * page-visit/impression tracking, so a conversion rate would have to be
   * fabricated. Everything below is computed from real contribution/participant
   * rows.
   */
  static async getPoolAnalytics(creatorId: string, poolId: string) {
    const pool = await CreatorPoolService.assertOwnership(creatorId, poolId);

    // Full participant set — used for aggregate stats. Kept separate from the
    // top-10 slice below (which is display-only) so counts aren't truncated to 10.
    const [contributions, participants] = await Promise.all([
      prisma.creatorPoolContribution.findMany({
        where: { poolId },
        orderBy: { createdAt: "asc" },
        select: { amountUsdc: true, creatorRevenue: true, createdAt: true, userId: true },
      }),
      prisma.creatorPoolParticipant.findMany({
        where: { poolId },
        orderBy: { totalContributed: "desc" },
        include: { user: { select: { username: true, country: true } } },
      }),
    ]);

    const totalContributions = contributions.length;
    const totalRaised = contributions.reduce((s, c) => s + Number(c.amountUsdc), 0);
    const revenueEarned = contributions.reduce((s, c) => s + Number(c.creatorRevenue), 0);

    const newParticipants = participants.filter((p) => p.contributionCount === 1).length;
    const returningParticipants = participants.filter((p) => p.contributionCount > 1).length;

    // Daily growth — bucket contributions by UTC day (last 30 days).
    const dailyMap = new Map<string, { count: number; amount: number }>();
    for (const c of contributions) {
      const day = c.createdAt.toISOString().slice(0, 10);
      const bucket = dailyMap.get(day) ?? { count: 0, amount: 0 };
      bucket.count += 1;
      bucket.amount += Number(c.amountUsdc);
      dailyMap.set(day, bucket);
    }
    const dailyGrowth = Array.from(dailyMap.entries())
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-30);

    // Geographic distribution — from participants' User.country (self-reported, optional field).
    const geoMap = new Map<string, number>();
    for (const p of participants) {
      const country = p.user.country ?? "Unknown";
      geoMap.set(country, (geoMap.get(country) ?? 0) + 1);
    }
    const geoDistribution = Array.from(geoMap.entries()).map(([country, count]) => ({ country, count }));

    return {
      totalContributions,
      totalRaised,
      revenueEarned,
      currentPoolValue: Number(pool.currentPoolValue),
      activeParticipants: participants.length,
      newParticipants,
      returningParticipants,
      dailyGrowth,
      topContributors: participants.slice(0, 5).map((p) => ({
        username: p.user.username,
        totalContributed: Number(p.totalContributed),
        contributionCount: p.contributionCount,
      })),
      geoDistribution,
    };
  }
}
