import { prisma } from "../utils/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/errors";

export interface CreateCreatorProfileInput {
  slug: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
}

export interface UpdateCreatorProfileInput {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
}

const RESERVED_SLUGS = new Set([
  "dashboard", "wallet", "leaderboard", "admin", "owner", "login", "register",
  "settings", "referrals", "staking", "burn", "subscribe", "transactions",
  "connect-wallet", "creator", "pool", "auth", "api",
]);

export class CreatorService {
  /**
   * Claim a Creator profile for a user. One creator profile per user
   * (Creator.userId is unique) — repeat calls for an already-claimed user fail.
   */
  static async createProfile(userId: string, input: CreateCreatorProfileInput) {
    if (RESERVED_SLUGS.has(input.slug)) {
      throw new BadRequestError(`"${input.slug}" is a reserved slug — pick another.`);
    }

    const existing = await prisma.creator.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictError("You already have a creator profile.");
    }

    const slugTaken = await prisma.creator.findUnique({ where: { slug: input.slug } });
    if (slugTaken) {
      throw new ConflictError("That creator URL is already taken.");
    }

    return prisma.creator.create({
      data: {
        userId,
        slug: input.slug,
        displayName: input.displayName,
        bio: input.bio,
        avatarUrl: input.avatarUrl,
        coverImageUrl: input.coverImageUrl,
        wallet: { create: {} },
      },
      include: { wallet: true },
    });
  }

  static async getByUserId(userId: string) {
    const creator = await prisma.creator.findUnique({
      where: { userId },
      include: { wallet: true },
    });
    if (!creator) throw new NotFoundError("No creator profile found");
    return creator;
  }

  static async getBySlug(slug: string) {
    const creator = await prisma.creator.findUnique({ where: { slug } });
    if (!creator) throw new NotFoundError("Creator not found");
    return creator;
  }

  static async updateProfile(userId: string, input: UpdateCreatorProfileInput) {
    const creator = await prisma.creator.findUnique({ where: { userId } });
    if (!creator) throw new NotFoundError("No creator profile found");

    return prisma.creator.update({
      where: { userId },
      data: input,
    });
  }
}
