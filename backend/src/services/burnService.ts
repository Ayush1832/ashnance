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
   * Activate a 1-hour ASH boost for a user.
   * Deducts boost_cost_ash from wallet and sets boostExpiresAt = now + boost_duration_ms.
   * If boost is already active, extends the timer by another hour.
   */
  static async activateBoost(userId: string): Promise<{ boostExpiresAt: Date; ashDeducted: number }> {
    const burnCfg = await OwnerService.getBurnConfig();

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError("Wallet not found");

    const ashBalance = Number(wallet.ashBalance);
    if (ashBalance < burnCfg.boost_cost_ash) {
      throw new InsufficientBalanceError(
        `Insufficient ASH. Need ${burnCfg.boost_cost_ash} ASH, you have ${ashBalance}`
      );
    }

    // Start from max(now, current expiry) so stacking adds to remaining time
    const base = wallet.boostExpiresAt && wallet.boostExpiresAt > new Date()
      ? wallet.boostExpiresAt
      : new Date();
    const boostExpiresAt = new Date(base.getTime() + burnCfg.boost_duration_ms);

    await prisma.wallet.update({
      where: { userId },
      data: {
        ashBalance:    { decrement: burnCfg.boost_cost_ash },
        boostExpiresAt,
      },
    });

    await prisma.transaction.create({
      data: {
        userId,
        type: "ASH_BOOST",
        amount: burnCfg.boost_cost_ash,
        currency: "ASH",
        status: "COMPLETED",
        description: `ASH boost activated — +0.5 weight for 1 hour`,
      },
    });

    return { boostExpiresAt, ashDeducted: burnCfg.boost_cost_ash };
  }

  /**
   * Get current boost status for a user.
   */
  static async getBoostStatus(userId: string) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError("Wallet not found");

    const now = new Date();
    const active = !!(wallet.boostExpiresAt && wallet.boostExpiresAt > now);
    const secondsLeft = active
      ? Math.floor((wallet.boostExpiresAt!.getTime() - now.getTime()) / 1000)
      : 0;

    return { active, boostExpiresAt: wallet.boostExpiresAt, secondsLeft };
  }

  /**
   * Execute a burn — the core game mechanic
   * Follows: project.md Sections 4, 5, 6, 7, 8
   */
  static async executeBurn(
    userId: string,
    amountUsdc: number,
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
    // base_unit is always 4.99 (the reference amount per spec Section 7)
    const baseUnit = burnCfg.base_unit ?? 4.99;
    const baseWeight = amountUsdc / baseUnit;

    // VIP bonus (Holy Fire only)
    let vipBonus = 0;
    if (user.isVip && user.vipExpiresAt && user.vipExpiresAt > new Date() && user.vipTier === "HOLY_FIRE") {
      vipBonus = burnCfg.vip_holy_fire_bonus;
    }

    // Referral bonus: +0.20 per 5 active referrals
    const activeReferrals = user.referralsMade.length;
    const referralBonus =
      Math.floor(activeReferrals / 5) * config.weight.referralBonusPer5;

    // Boost bonus — time-based (1 hour), already paid for at activation
    const now = new Date();
    const boostActive = !!(user.wallet.boostExpiresAt && user.wallet.boostExpiresAt > now);
    const boostBonus = boostActive ? config.weight.ashBoostBonus : 0;

    const finalWeight = baseWeight + vipBonus + referralBonus + boostBonus;

    // ---- DETERMINE WIN/LOSE ----
    const effectiveChance =
      finalWeight / (finalWeight + burnCfg.constant_factor);

    const randomNumber = BlockchainService.simulateVRF(userId + Date.now().toString());
    const isWinner = randomNumber <= effectiveChance;

    // ---- DETERMINE PRIZE OR ASH ----
    let prizeTier: string | null = null;
    let prizeAmount: number | null = null;
    let ashReward: number | null = null;

    const pool = await prisma.rewardPool.findFirst();
    const poolBalance = pool ? Number(pool.totalBalance) : 0;
    const maxPayout = Math.floor(poolBalance * 0.5); // no single payout > 50% of pool

    if (isWinner) {
      // Select prize tier by probability roll
      const prizeRoll = Math.random();
      let selectedTier: string;
      let selectedAmount: number;

      if (prizeRoll <= burnCfg.jackpot_prob) {
        selectedTier = "JACKPOT"; selectedAmount = burnCfg.jackpot_amount;
      } else if (prizeRoll <= burnCfg.big_prob) {
        selectedTier = "BIG";     selectedAmount = burnCfg.big_amount;
      } else if (prizeRoll <= burnCfg.medium_prob) {
        selectedTier = "MEDIUM";  selectedAmount = burnCfg.medium_amount;
      } else {
        selectedTier = "SMALL";   selectedAmount = burnCfg.small_amount;
      }

      // Downgrade prize tier if pool can't cover it (per spec Section 8 Step 4)
      const tiers = [
        { tier: selectedTier, amount: selectedAmount },
        { tier: "BIG",    amount: burnCfg.big_amount },
        { tier: "MEDIUM", amount: burnCfg.medium_amount },
        { tier: "SMALL",  amount: burnCfg.small_amount },
      ];
      // Deduplicate (if selectedTier is already BIG/MEDIUM/SMALL, avoid dupes)
      const seen = new Set<string>();
      const fallbackChain = tiers.filter(t => {
        if (seen.has(t.tier)) return false;
        seen.add(t.tier);
        return true;
      });

      for (const t of fallbackChain) {
        const effective = Math.min(t.amount, maxPayout);
        if (effective > 0 && poolBalance >= effective) {
          prizeTier   = t.tier;
          prizeAmount = effective;
          break;
        }
      }
      // If pool can't afford even SMALL → fall through to ASH reward below
    }

    const actuallyWon = isWinner && prizeAmount !== null;

    if (!actuallyWon) {
      // ASH reward on loss — proportional to burn amount at $0.01/ASH
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

      // 2. Split burn amount into pools (ratios from DB config)
      const rewardPoolAmount = amountUsdc * burnCfg.reward_pool_split;

      await tx.rewardPool.updateMany({
        data: { totalBalance: { increment: rewardPoolAmount } },
      });

      const profitPoolAmount = amountUsdc * burnCfg.profit_pool_split;
      await tx.profitPool.updateMany({
        data: {
          balance: { increment: profitPoolAmount },
          totalDeposited: { increment: profitPoolAmount },
        },
      });

      // 3. Create burn record
      const burnRecord = await tx.burn.create({
        data: {
          userId,
          amountUsdc,
          weight: baseWeight,
          finalWeight,
          isWinner: actuallyWon,
          prizeTier: prizeTier as any,
          prizeAmount,
          ashReward,
          vrfSeed: randomNumber.toString(),
        },
      });

      // 4. Credit winnings
      if (actuallyWon && prizeAmount) {
        await tx.wallet.update({
          where: { userId },
          data: { usdcBalance: { increment: prizeAmount } },
        });

        await tx.rewardPool.updateMany({
          data: {
            totalBalance: { decrement: prizeAmount },
            totalPaidOut: { increment: prizeAmount },
          },
        });

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

      // 5. Credit ASH reward on loss
      if (!actuallyWon && ashReward) {
        await tx.wallet.update({
          where: { userId },
          data: { ashBalance: { increment: ashReward } },
        });
      }

      // 6. Burn transaction log
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

      // 7. Process referral reward
      if (user.referredById) {
        const referralReward = amountUsdc * burnCfg.referral_commission;

        await tx.wallet.update({
          where: { userId: user.referredById },
          data: { usdcBalance: { increment: referralReward } },
        });

        await tx.referral.updateMany({
          where: { referrerId: user.referredById, refereeId: userId },
          data: { totalBurns: { increment: 1 }, totalEarned: { increment: referralReward } },
        });

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

        await tx.rewardPool.updateMany({
          data: { totalBalance: { decrement: referralReward } },
        });
      }

      return burnRecord;
    });

    return {
      burnId: burn.id,
      isWinner: actuallyWon,
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
