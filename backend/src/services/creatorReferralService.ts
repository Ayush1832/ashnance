import { prisma } from "../utils/prisma";
import { NotFoundError } from "../utils/errors";

export class CreatorReferralService {
  /**
   * Associate a user with a creator, either via a referral code (the creator's
   * personal link) or a direct visit. Idempotent — repeat calls for an already-
   * following user are a no-op (unique [creatorId, userId]).
   */
  static async follow(userId: string, creatorSlug: string, referralCode?: string) {
    const creator = await prisma.creator.findUnique({ where: { slug: creatorSlug } });
    if (!creator) throw new NotFoundError("Creator not found");

    const existing = await prisma.creatorFollower.findUnique({
      where: { creatorId_userId: { creatorId: creator.id, userId } },
    });
    if (existing) return existing;

    const joinedVia = referralCode && referralCode === creator.referralCode ? "referral" : "direct";

    return prisma.creatorFollower.create({
      data: { creatorId: creator.id, userId, joinedVia },
    });
  }

  static async getStats(creatorId: string) {
    const [total, viaReferral, recent] = await Promise.all([
      prisma.creatorFollower.count({ where: { creatorId } }),
      prisma.creatorFollower.count({ where: { creatorId, joinedVia: "referral" } }),
      prisma.creatorFollower.findMany({
        where: { creatorId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { username: true } } },
      }),
    ]);

    return {
      totalFollowers: total,
      viaReferral,
      viaDirect: total - viaReferral,
      recentFollowers: recent.map((f) => ({
        username: f.user.username,
        joinedVia: f.joinedVia,
        joinedAt: f.createdAt,
      })),
    };
  }
}
