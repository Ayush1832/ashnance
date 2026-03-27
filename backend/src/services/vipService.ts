import { prisma } from "../utils/prisma";
import { config } from "../config";
import {
  BadRequestError,
  NotFoundError,
  InsufficientBalanceError,
} from "../utils/errors";

export type VipTier = "SPARK" | "ACTIVE_ASH" | "HOLY_FIRE";

interface TierConfig {
  name: VipTier;
  price: number;
  weightBonus: number;
  ashBonusPercent: number;
  raffleEntry: boolean;
}

const TIERS: Record<VipTier, TierConfig> = {
  SPARK: { name: "SPARK", price: 0, weightBonus: 0.10, ashBonusPercent: 0, raffleEntry: false },
  ACTIVE_ASH: { name: "ACTIVE_ASH", price: 9.99, weightBonus: 0.25, ashBonusPercent: 10, raffleEntry: false },
  HOLY_FIRE: { name: "HOLY_FIRE", price: 24.99, weightBonus: 0.50, ashBonusPercent: 20, raffleEntry: true },
};

export class VipService {
  /**
   * Subscribe user to a VIP tier — deducts USDC from wallet balance
   */
  static async subscribe(userId: string, tier: VipTier) {
    const tierConfig = TIERS[tier];
    if (!tierConfig) throw new BadRequestError("Invalid VIP tier");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user || !user.wallet) throw new NotFoundError("User not found");

    // Check if already subscribed to this tier
    if (user.isVip && user.vipTier === tier && user.vipExpiresAt && user.vipExpiresAt > new Date()) {
      throw new BadRequestError(`Already subscribed to ${tier} until ${user.vipExpiresAt.toISOString()}`);
    }

    // Check balance (free tier doesn't require payment)
    if (tierConfig.price > 0) {
      if (Number(user.wallet.usdcBalance) < tierConfig.price) {
        throw new InsufficientBalanceError(
          `Insufficient balance. Need $${tierConfig.price} USDC, have $${user.wallet.usdcBalance}`
        );
      }
    }

    // Calculate expiration (30 days from now)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Execute in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Deduct payment
      if (tierConfig.price > 0) {
        await tx.wallet.update({
          where: { userId },
          data: { usdcBalance: { decrement: tierConfig.price } },
        });

        // Transaction log
        await tx.transaction.create({
          data: {
            userId,
            type: "VIP_PURCHASE",
            amount: tierConfig.price,
            currency: "USDC",
            status: "COMPLETED",
            description: `${tier} VIP subscription (30 days)`,
          },
        });
      }

      // Update user VIP status
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          isVip: true,
          vipTier: tier,
          vipExpiresAt: expiresAt,
        },
      });

      return updatedUser;
    });

    return {
      tier,
      price: tierConfig.price,
      expiresAt,
      weightBonus: tierConfig.weightBonus,
      ashBonusPercent: tierConfig.ashBonusPercent,
      userId: result.id,
    };
  }

  /**
   * Cancel VIP subscription
   */
  static async cancel(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");

    if (!user.isVip) throw new BadRequestError("No active VIP subscription");

    await prisma.user.update({
      where: { id: userId },
      data: {
        isVip: false,
        vipTier: null,
        vipExpiresAt: null,
      },
    });

    return { success: true, message: "VIP subscription cancelled" };
  }

  /**
   * Get VIP status for user
   */
  static async getStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isVip: true, vipTier: true, vipExpiresAt: true },
    });

    if (!user) throw new NotFoundError("User not found");

    const isActive = user.isVip && user.vipExpiresAt && user.vipExpiresAt > new Date();

    return {
      isVip: isActive,
      tier: isActive ? user.vipTier : null,
      expiresAt: isActive ? user.vipExpiresAt : null,
      config: user.vipTier ? TIERS[user.vipTier as VipTier] : null,
      tiers: TIERS,
    };
  }

  /**
   * Auto-renew expired VIP subscriptions (called by cron/scheduler)
   */
  static async processAutoRenewals() {
    const expiredVips = await prisma.user.findMany({
      where: {
        isVip: true,
        vipExpiresAt: { lte: new Date() },
      },
      include: { wallet: true },
    });

    const results = { renewed: 0, expired: 0 };

    for (const user of expiredVips) {
      const tierConfig = user.vipTier ? TIERS[user.vipTier as VipTier] : null;
      if (!tierConfig || !user.wallet) {
        // Can't renew — expire
        await prisma.user.update({
          where: { id: user.id },
          data: { isVip: false, vipTier: null, vipExpiresAt: null },
        });
        results.expired++;
        continue;
      }

      // Check if enough balance for renewal
      if (Number(user.wallet.usdcBalance) >= tierConfig.price) {
        try {
          await VipService.subscribe(user.id, tierConfig.name);
          results.renewed++;
        } catch {
          // Insufficient funds or error — expire
          await prisma.user.update({
            where: { id: user.id },
            data: { isVip: false, vipTier: null, vipExpiresAt: null },
          });
          results.expired++;
        }
      } else {
        // Not enough balance — expire
        await prisma.user.update({
          where: { id: user.id },
          data: { isVip: false, vipTier: null, vipExpiresAt: null },
        });
        results.expired++;
      }
    }

    return results;
  }
}
