import { prisma } from "../utils/prisma";
import { config } from "../config";
import {
  InsufficientBalanceError,
  BadRequestError,
  NotFoundError,
} from "../utils/errors";
import { BlockchainService } from "./blockchainService";
import { OwnerService, ASH_TOKEN_PRICE_USD } from "./ownerService";

export interface BurnResult {
  burnId: string;
  isWinner: boolean;
  prizeTier: string | null;
  prizeAmount: number | null;
  ashReward: number | null;
  weight: number;
  finalWeight: number;
  effectiveChance: number;
}

export class BurnService {
  /**
   * Execute a burn — the core game mechanic
   * Follows: feature_spec.md Sections 4, 5, 6, 7
   */
  static async executeBurn(
    userId: string,
    amountUsdc: number,
    useBoost: boolean = false
  ): Promise<BurnResult> {
    // Load live burn config from DB first — all game parameters come from here
    const burnCfg = await OwnerService.getBurnConfig();

    if (amountUsdc < burnCfg.min_burn_amount) {
      throw new BadRequestError(`Minimum burn amount is $${burnCfg.min_burn_amount} USDC`);
    }

    // Get user with wallet
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        referralsMade: { where: { isActive: true } },
      },
    });

    if (!user || !user.wallet) {
      throw new NotFoundError("User or wallet not found");
    }

    // Check balance
    if (Number(user.wallet.usdcBalance) < amountUsdc) {
      throw new InsufficientBalanceError(
        `Insufficient balance. You have $${user.wallet.usdcBalance} USDC, need $${amountUsdc}`
      );
    }

    // ---- CALCULATE WEIGHT ----
    const baseWeight = amountUsdc / burnCfg.min_burn_amount;

    // VIP bonus
    let vipBonus = 0;
    if (user.isVip && user.vipExpiresAt && user.vipExpiresAt > new Date()) {
      switch (user.vipTier) {
        case "SPARK":      vipBonus = burnCfg.vip_spark_bonus;      break;
        case "ACTIVE_ASH": vipBonus = burnCfg.vip_active_ash_bonus; break;
        case "HOLY_FIRE":  vipBonus = burnCfg.vip_holy_fire_bonus;  break;
      }
    }

    // Referral bonus: +0.20 per 5 active referrals (not yet owner-configurable)
    const activeReferrals = user.referralsMade.length;
    const referralBonus =
      Math.floor(activeReferrals / 5) * config.weight.referralBonusPer5;

    // Boost bonus
    let boostBonus = 0;
    if (useBoost) {
      const ashBalance = Number(user.wallet.ashBalance);
      if (ashBalance >= burnCfg.boost_cost_ash) {
        boostBonus = config.weight.ashBoostBonus;
      }
    }

    const finalWeight = baseWeight + vipBonus + referralBonus + boostBonus;

    // ---- DETERMINE WIN/LOSE ----
    // EffectiveChance = FinalWeight / (FinalWeight + ConstantFactor)
    const effectiveChance =
      finalWeight / (finalWeight + burnCfg.constant_factor);

    // VRF simulation (in production, use Switchboard VRF on-chain)
    const randomNumber = BlockchainService.simulateVRF(userId + Date.now().toString());
    let isWinner = randomNumber <= effectiveChance;

    // ---- DETERMINE PRIZE OR ASH ----
    let prizeTier: string | null = null;
    let prizeAmount: number | null = null;
    let ashReward: number | null = null;

    // Fetch pool once — used for cap check and ASH fallback
    const pool = await prisma.rewardPool.findFirst();
    const poolBalance = pool ? Number(pool.totalBalance) : 0;

    // Hard cap: no single payout may exceed 50% of current pool.
    // If pool is below the minimum viable threshold, suspend wins and give
    // ASH instead — this prevents draining a thin pool.
    const MAX_PAYOUT_RATIO = 0.5;
    const MIN_POOL_FOR_WIN  = config.game.minBurnAmount * 10; // ~$49.90 at $4.99 min

    if (isWinner && poolBalance >= MIN_POOL_FOR_WIN) {
      const maxPayout = Math.floor(poolBalance * MAX_PAYOUT_RATIO);

      // Prize tier selection — probabilities and amounts from DB config
      const prizeRoll = Math.random();
      if (prizeRoll <= burnCfg.jackpot_prob) {
        prizeTier = "JACKPOT";
        prizeAmount = burnCfg.jackpot_amount;
      } else if (prizeRoll <= burnCfg.big_prob) {
        prizeTier = "BIG";
        prizeAmount = burnCfg.big_amount;
      } else if (prizeRoll <= burnCfg.medium_prob) {
        prizeTier = "MEDIUM";
        prizeAmount = burnCfg.medium_amount;
      } else {
        prizeTier = "SMALL";
        prizeAmount = burnCfg.small_amount;
      }

      // Apply hard cap — scale down to maxPayout if prize exceeds it
      if (prizeAmount > maxPayout) {
        prizeAmount = maxPayout;
      }
    } else {
      // Pool too thin OR random said lose — give ASH reward
      isWinner = false;
    }

    if (!isWinner) {
      // ASH reward on lose (also covers pool-suspended wins above)
      // Proportional to burn amount: ash_reward_percent of burn value at $0.01/ASH
      // e.g. burn $1, percent=1.0 → $1 worth → 100 ASH
      ashReward = Math.floor(
        (amountUsdc * burnCfg.ash_reward_percent) / ASH_TOKEN_PRICE_USD
      );

      // VIP bonus: +20% ASH for Holy Fire
      if (user.vipTier === "HOLY_FIRE") {
        ashReward = Math.floor(ashReward * 1.2);
      }
    }

    // ---- EXECUTE IN TRANSACTION ----
    const burn = await prisma.$transaction(async (tx: any) => {
      // 1. Deduct USDC from wallet
      await tx.wallet.update({
        where: { userId },
        data: {
          usdcBalance: { decrement: amountUsdc },
        },
      });

      // 2. Deduct ASH for boost if used
      if (useBoost && boostBonus > 0) {
        await tx.wallet.update({
          where: { userId },
          data: {
            ashBalance: { decrement: burnCfg.boost_cost_ash },
          },
        });
      }

      // 3. Split burn amount into pools (ratios from DB config)
      const rewardPoolAmount = amountUsdc * burnCfg.reward_pool_split;

      // Update reward pool
      await tx.rewardPool.updateMany({
        data: { totalBalance: { increment: rewardPoolAmount } },
      });

      // Update profit pool
      const profitPoolAmount = amountUsdc * burnCfg.profit_pool_split;
      await tx.profitPool.updateMany({
        data: {
          balance: { increment: profitPoolAmount },
          totalDeposited: { increment: profitPoolAmount },
        },
      });

      // 4. Create burn record
      const burnRecord = await tx.burn.create({
        data: {
          userId,
          amountUsdc,
          weight: baseWeight,
          finalWeight,
          isWinner,
          prizeTier: prizeTier as any,
          prizeAmount,
          ashReward,
          vrfSeed: randomNumber.toString(),
        },
      });

      // 5. Credit winnings
      if (isWinner && prizeAmount) {
        await tx.wallet.update({
          where: { userId },
          data: { usdcBalance: { increment: prizeAmount } },
        });

        // Deduct from reward pool
        await tx.rewardPool.updateMany({
          data: {
            totalBalance: { decrement: prizeAmount },
            totalPaidOut: { increment: prizeAmount },
          },
        });

        // Win transaction log
        await tx.transaction.create({
          data: {
            userId,
            type: "WIN",
            amount: prizeAmount,
            currency: "USDC",
            status: "COMPLETED",
            description: `Won ${prizeTier} prize`,
          },
        });
      }

      // 6. Credit ASH reward on loss
      if (!isWinner && ashReward) {
        await tx.wallet.update({
          where: { userId },
          data: { ashBalance: { increment: ashReward } },
        });
      }

      // 7. Burn transaction log
      await tx.transaction.create({
        data: {
          userId,
          type: "BURN",
          amount: amountUsdc,
          currency: "USDC",
          status: "COMPLETED",
          description: `Burned $${amountUsdc} USDC`,
        },
      });

      // 8. Process referral reward (% of burn, rate from DB config)
      if (user.referredById) {
        const referralReward = amountUsdc * burnCfg.referral_commission;

        // Credit referrer's wallet
        await tx.wallet.update({
          where: { userId: user.referredById },
          data: { usdcBalance: { increment: referralReward } },
        });

        // Update referral record
        await tx.referral.updateMany({
          where: {
            referrerId: user.referredById,
            refereeId: userId,
          },
          data: {
            totalBurns: { increment: 1 },
            totalEarned: { increment: referralReward },
          },
        });

        // Referral transaction log
        await tx.transaction.create({
          data: {
            userId: user.referredById,
            type: "REFERRAL_REWARD",
            amount: referralReward,
            currency: "USDC",
            status: "COMPLETED",
            description: `Referral reward from ${user.username}'s burn`,
          },
        });

        // Deduct from reward pool
        await tx.rewardPool.updateMany({
          data: { totalBalance: { decrement: referralReward } },
        });
      }

      return burnRecord;
    });

    return {
      burnId: burn.id,
      isWinner,
      prizeTier,
      prizeAmount,
      ashReward,
      weight: baseWeight,
      finalWeight,
      effectiveChance,
    };
  }

  /**
   * Get burn history for a user
   */
  static async getBurnHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const [burns, total] = await Promise.all([
      prisma.burn.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.burn.count({ where: { userId } }),
    ]);

    return {
      burns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get burn stats for a user
   */
  static async getBurnStats(userId: string) {
    const [totalBurns, totalWins, stats, biggestWin] = await Promise.all([
      prisma.burn.count({ where: { userId } }),
      prisma.burn.count({ where: { userId, isWinner: true } }),
      prisma.burn.aggregate({
        where: { userId },
        _sum: { amountUsdc: true, ashReward: true },
      }),
      prisma.burn.findFirst({
        where: { userId, isWinner: true },
        orderBy: { prizeAmount: "desc" },
      }),
    ]);

    return {
      totalBurns,
      totalWins,
      winRate: totalBurns > 0 ? ((totalWins / totalBurns) * 100).toFixed(1) : "0.0",
      totalBurned: stats._sum.amountUsdc || 0,
      totalAshEarned: stats._sum.ashReward || 0,
      biggestWin: biggestWin?.prizeAmount || 0,
    };
  }
}
