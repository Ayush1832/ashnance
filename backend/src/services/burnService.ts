import { prisma } from "../utils/prisma";
import { config } from "../config";
import {
  InsufficientBalanceError,
  BadRequestError,
  NotFoundError,
} from "../utils/errors";
import { BlockchainService } from "./blockchainService";
import { OwnerService, ASH_TOKEN_PRICE_USD } from "./ownerService";
import { RoundService } from "./roundService";

export interface BurnResult {
  burnId: string;
  ashReward: number;
  weight: number;
  finalWeight: number;
  userCumulativeWeight: number;
  // Round context
  roundId: string | null;
  roundCurrentPool: number;
  roundTargetPool: number;
  roundProgressPercent: number;
  userRoundRank: number | null;
  // Set only when this burn triggered the round to end
  roundEnded: boolean;
  roundWinner: string | null;
  roundPrize: number | null;
  roundNumber: number | null;
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
   * Execute a burn — the core game mechanic (round-based competitive system).
   *
   * Every burn:
   *  1. Deducts USDC from the user's wallet
   *  2. Splits the amount: reward_pool_split → round prize pool, profit_pool_split → profit
   *  3. Adds finalWeight to the user's persistent cumulativeWeight (leaderboard ranking)
   *  4. Grants ASH tokens to the burner (always — no per-burn random win/lose)
   *  5. Checks if round.currentPool >= prizePoolTarget → if so, ends the round and pays winner
   *
   * The WINNER is the user ranked #1 by cumulativeWeight (weight accumulated during this round)
   * at the exact moment the prize pool hits its target.
   */
  static async executeBurn(
    userId: string,
    amountUsdc: number,
  ): Promise<BurnResult> {
    // Load live burn config from DB
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

    // Boost bonus — time-based (1 hour)
    const now = new Date();
    const boostActive = !!(user.wallet.boostExpiresAt && user.wallet.boostExpiresAt > now);
    const boostBonus = boostActive ? config.weight.ashBoostBonus : 0;

    const finalWeight = baseWeight + vipBonus + referralBonus + boostBonus;

    // ---- ASH REWARD (all burners receive ASH) ----
    let ashReward = Math.floor(
      (amountUsdc * burnCfg.ash_reward_percent) / ASH_TOKEN_PRICE_USD
    );
    // VIP bonus: +20% ASH for Holy Fire
    if (user.vipTier === "HOLY_FIRE") {
      ashReward = Math.floor(ashReward * 1.2);
    }

    // ---- GET ACTIVE ROUND ----
    const activeRound = await RoundService.getActiveRound();

    // ---- EXECUTE IN TRANSACTION ----
    const rewardPoolAmount = amountUsdc * burnCfg.reward_pool_split;
    const profitPoolAmount = amountUsdc * burnCfg.profit_pool_split;

    let newCumulativeWeight = 0;
    let newRoundPool = 0;

    const burn = await prisma.$transaction(async (tx: any) => {
      // 1. Deduct USDC from wallet and update cumulativeWeight
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          usdcBalance:      { decrement: amountUsdc },
          ashBalance:       { increment: ashReward },
          cumulativeWeight: { increment: finalWeight },
        },
      });
      newCumulativeWeight = Number(updatedWallet.cumulativeWeight);

      // 2. Split into pools
      await tx.rewardPool.updateMany({
        data: { totalBalance: { increment: rewardPoolAmount } },
      });

      await tx.profitPool.updateMany({
        data: {
          balance:        { increment: profitPoolAmount },
          totalDeposited: { increment: profitPoolAmount },
        },
      });

      // 3. Update round's currentPool if there's an active round
      if (activeRound) {
        const updatedRound = await tx.round.update({
          where: { id: activeRound.id },
          data: { currentPool: { increment: rewardPoolAmount } },
        });
        newRoundPool = Number(updatedRound.currentPool);
      }

      // 4. Create burn record
      const burnRecord = await tx.burn.create({
        data: {
          userId,
          amountUsdc,
          weight:     baseWeight,
          finalWeight,
          ashReward,
          roundId:    activeRound?.id ?? null,
          isWinner:   false,
          vrfSeed:    BlockchainService.simulateVRF(userId + Date.now().toString()).toString(),
        },
      });

      // 5. Burn transaction log
      await tx.transaction.create({
        data: {
          userId,
          type:        "BURN",
          amount:      amountUsdc,
          currency:    "USDC",
          status:      "COMPLETED",
          description: `Burned $${amountUsdc} USDC${activeRound ? ` (Round #${activeRound.roundNumber})` : ""}`,
        },
      });

      // 6. Process referral reward
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
            userId:      user.referredById,
            type:        "REFERRAL_REWARD",
            amount:      referralReward,
            currency:    "USDC",
            status:      "COMPLETED",
            description: `Referral reward from ${user.username}'s burn`,
          },
        });

        await tx.rewardPool.updateMany({
          data: { totalBalance: { decrement: referralReward } },
        });
      }

      return burnRecord;
    });

    // ---- CHECK IF ROUND SHOULD END (outside main tx to avoid nested tx issues) ----
    let roundEnded = false;
    let roundWinner: string | null = null;
    let roundPrize: number | null = null;
    let roundNumber: number | null = null;

    if (activeRound && newRoundPool >= Number(activeRound.prizePoolTarget)) {
      try {
        const result = await RoundService.endRound(activeRound.id);
        roundEnded = true;
        roundWinner = result.winner.username;
        roundPrize = result.prizeAmount;
        roundNumber = result.roundNumber;

        // Mark the winning burn
        await prisma.burn.update({
          where: { id: burn.id },
          data: { isWinner: userId === result.winner.userId },
        });
      } catch {
        // Round may have already been ended (race condition) — ignore
      }
    }

    // ---- GET USER'S CURRENT ROUND RANK ----
    let userRoundRank: number | null = null;
    const prizePoolTarget = activeRound ? Number(activeRound.prizePoolTarget) : burnCfg.prize_pool_target ?? 500;
    const currentPool = activeRound ? newRoundPool : 0;

    if (activeRound && !roundEnded) {
      const leaderboard = await RoundService.getRoundLeaderboard(activeRound.id);
      const entry = leaderboard.find((e) => e.userId === userId);
      userRoundRank = entry?.rank ?? null;
    }

    return {
      burnId:               burn.id,
      ashReward,
      weight:               baseWeight,
      finalWeight,
      userCumulativeWeight: newCumulativeWeight,
      roundId:              activeRound?.id ?? null,
      roundCurrentPool:     currentPool,
      roundTargetPool:      prizePoolTarget,
      roundProgressPercent: prizePoolTarget > 0
        ? Math.min(100, (currentPool / prizePoolTarget) * 100)
        : 0,
      userRoundRank,
      roundEnded,
      roundWinner,
      roundPrize,
      roundNumber,
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
        include: { round: { select: { roundNumber: true, status: true } } },
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
    const [totalBurns, totalWins, stats, wallet] = await Promise.all([
      prisma.burn.count({ where: { userId } }),
      prisma.burn.count({ where: { userId, isWinner: true } }),
      prisma.burn.aggregate({
        where: { userId },
        _sum: { amountUsdc: true, ashReward: true },
      }),
      prisma.wallet.findUnique({ where: { userId }, select: { cumulativeWeight: true } }),
    ]);

    return {
      totalBurns,
      totalWins,
      totalBurned:       stats._sum.amountUsdc || 0,
      totalAshEarned:    stats._sum.ashReward || 0,
      cumulativeWeight:  wallet ? Number(wallet.cumulativeWeight) : 0,
    };
  }
}
