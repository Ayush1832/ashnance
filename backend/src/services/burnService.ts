import { prisma } from "../utils/prisma";
import { config } from "../config";
import {
  InsufficientBalanceError,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
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
  emissionMultiplier: number;
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
   * Deducts boost_cost_ash from wallet, sets boostExpiresAt, and
   * executes a real on-chain ASH burn from the platform treasury
   * so circulating supply actually decreases.
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

    // Atomic guarded debit + log in one transaction. The `gte` guard prevents
    // concurrent boost/burn requests from both passing a stale balance read and
    // driving ASH negative (previously this was a bare, unguarded update).
    const debited = await prisma.$transaction(async (tx: any) => {
      const res = await tx.wallet.updateMany({
        where: { userId, ashBalance: { gte: burnCfg.boost_cost_ash } },
        data: {
          ashBalance:    { decrement: burnCfg.boost_cost_ash },
          boostExpiresAt,
        },
      });
      if (res.count === 0) return false;
      await tx.transaction.create({
        data: {
          userId,
          type: "BOOST",
          amount: burnCfg.boost_cost_ash,
          currency: "ASH",
          status: "COMPLETED",
          description: `ASH boost activated — +0.5 weight for 1 hour`,
        },
      });
      return true;
    });
    if (!debited) {
      throw new InsufficientBalanceError(
        `Insufficient ASH. Need ${burnCfg.boost_cost_ash} ASH to activate boost.`
      );
    }

    // Real on-chain burn from platform ASH treasury — reduces circulating supply
    if (process.env.ASH_MINT_ADDRESS) {
      try {
        await BlockchainService.burnAshFromTreasury(burnCfg.boost_cost_ash);
      } catch (err) {
        // Non-fatal: DB balance is already reduced. Log for reconciliation.
        console.error("[BurnService] On-chain ASH burn failed (DB already updated):", err);
      }
    }

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
   * Execute a participation — the core game mechanic (round-based competitive system).
   *
   * Pool split (configurable, default 40/40/20):
   *   - 40% → reward pool (prize fund for round winner)
   *   - 40% → profit pool (owner revenue)
   *   - 20% → referral pool (dedicated referral/reward budget)
   *
   * Referral commission is paid from the referral pool — never destabilises the prize pool.
   *
   * Burns are BLOCKED when no active round exists.
   */
  static async executeBurn(
    userId: string,
    amountUsdc: number,
  ): Promise<BurnResult> {
    const burnCfg = await OwnerService.getBurnConfig();

    if (amountUsdc < burnCfg.min_burn_amount) {
      throw new BadRequestError(`Minimum participation amount is $${burnCfg.min_burn_amount} USDC`);
    }
    const maxBurn = burnCfg.max_burn_amount ?? 10_000;
    if (amountUsdc > maxBurn) {
      throw new BadRequestError(`Maximum participation is $${maxBurn} USDC per transaction`);
    }

    // Get user with wallet — check ban status first
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

    // Banned users cannot participate
    if (user.isBanned) {
      throw new ForbiddenError("Your account has been suspended. Please contact support.");
    }

    // ---- REQUIRE ACTIVE ROUND ----
    const activeRound = await RoundService.getActiveRound();
    if (!activeRound) {
      throw new BadRequestError(
        "No active round. Participation is only allowed during an active round. " +
        "Please wait for the next round to begin."
      );
    }

    // ---- EMISSION MULTIPLIER ----
    const emissionMultiplier = await OwnerService.getEmissionMultiplier();
    // effectiveAshReward = base_reward × emissionMultiplier
    // This halves every emission_halving_threshold ASH emitted, creating scarcity over time.

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
    const rawReferralBonus =
      Math.floor(activeReferrals / 5) * config.weight.referralBonusPer5;

    // Boost bonus — time-based (1 hour)
    const now = new Date();
    const boostActive = !!(user.wallet.boostExpiresAt && user.wallet.boostExpiresAt > now);
    const boostBonus = boostActive ? config.weight.ashBoostBonus : 0;

    // req #4 — Referral limit: referral bonus ≤ 40% of total weight
    const referralCapPct = burnCfg.referral_weight_cap_pct ?? 0.40;
    const nonReferralWeight = baseWeight + vipBonus + boostBonus;
    const maxReferralWeight = (referralCapPct / (1 - referralCapPct)) * nonReferralWeight;
    const referralBonus = Math.min(rawReferralBonus, maxReferralWeight);

    const rawTotalWeight = baseWeight + vipBonus + referralBonus + boostBonus;

    // req #3 — Weight cap: max effective weight = 300, diminishing returns above cap
    const weightCap = burnCfg.weight_cap ?? 300;
    const finalWeight = rawTotalWeight <= weightCap
      ? rawTotalWeight
      : weightCap + Math.sqrt(rawTotalWeight - weightCap);

    // ---- ASH REWARD (with emission multiplier) ----
    let ashReward = Math.floor(
      (amountUsdc * burnCfg.ash_reward_percent * emissionMultiplier) / ASH_TOKEN_PRICE_USD
    );
    // VIP bonus: +20% ASH for Holy Fire (only while VIP is active)
    if (user.isVip && user.vipExpiresAt && user.vipExpiresAt > new Date() && user.vipTier === "HOLY_FIRE") {
      ashReward = Math.floor(ashReward * 1.2);
    }

    // ---- POOL SPLITS (40/40/20) ----
    const rewardPoolSplit   = burnCfg.reward_pool_split   ?? 0.40;
    const profitPoolSplit   = burnCfg.profit_pool_split   ?? 0.40;
    const referralPoolSplit = burnCfg.referral_pool_split ?? 0.20;

    const rewardPoolAmount   = amountUsdc * rewardPoolSplit;
    const profitPoolAmount   = amountUsdc * profitPoolSplit;
    const referralPoolAmount = amountUsdc * referralPoolSplit;

    let newCumulativeWeight = 0;
    let newRoundPool = 0;

    const burn = await prisma.$transaction(async (tx: any) => {
      // 1. Atomic GUARDED debit: only decrement if the balance still covers the
      //    burn. The `gte` guard pushes the invariant into the DB, so concurrent
      //    burns/withdrawals can't both pass a stale balance read (TOCTOU) and
      //    drive the wallet negative while minting double weight/ASH.
      const debit = await tx.wallet.updateMany({
        where: { userId, usdcBalance: { gte: amountUsdc } },
        data: {
          usdcBalance:      { decrement: amountUsdc },
          ashBalance:       { increment: ashReward },
          cumulativeWeight: { increment: finalWeight },
        },
      });
      if (debit.count === 0) {
        throw new InsufficientBalanceError(
          `Insufficient balance to participate with $${amountUsdc} USDC.`
        );
      }
      // Display value only — the authoritative increment committed atomically
      // above (re-reading is unnecessary and avoids an extra round-trip).
      // user.wallet is non-null here (guarded at the top of executeBurn).
      newCumulativeWeight = Number(user.wallet!.cumulativeWeight) + finalWeight;

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
      await tx.referralPool.updateMany({
        data: {
          balance:        { increment: referralPoolAmount },
          totalDeposited: { increment: referralPoolAmount },
        },
      });

      // 3. Update round's currentPool
      const updatedRound = await tx.round.update({
        where: { id: activeRound.id },
        data: { currentPool: { increment: rewardPoolAmount } },
      });
      newRoundPool = Number(updatedRound.currentPool);

      // 4. Create burn record
      const burnRecord = await tx.burn.create({
        data: {
          userId,
          amountUsdc,
          weight:     baseWeight,
          finalWeight,
          ashReward,
          roundId:    activeRound.id,
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
          description: `Participated $${amountUsdc} USDC (Round #${activeRound.roundNumber})`,
        },
      });

      // 6. Process referral reward from referral pool (NOT from reward pool)
      if (user.referredById) {
        const referralReward = amountUsdc * (burnCfg.referral_commission ?? 0.10);

        // Cap referral reward to available referral pool balance
        const currentReferralPool = await tx.referralPool.findFirst();
        const availableReferralBudget = Number(currentReferralPool?.balance ?? 0);
        const actualReward = Math.min(referralReward, availableReferralBudget);

        if (actualReward > 0) {
          await tx.wallet.updateMany({
            where: { userId: user.referredById },
            data: { usdcBalance: { increment: actualReward } },
          });

          await tx.referral.updateMany({
            where: { referrerId: user.referredById, refereeId: userId },
            data: { totalBurns: { increment: 1 }, totalEarned: { increment: actualReward } },
          });

          await tx.transaction.create({
            data: {
              userId:      user.referredById,
              type:        "REFERRAL",
              amount:      actualReward,
              currency:    "USDC",
              status:      "COMPLETED",
              description: `Referral reward from ${user.username}'s participation`,
            },
          });

          // Deduct from referral pool (not reward pool)
          await tx.referralPool.updateMany({
            data: {
              balance:     { decrement: actualReward },
              totalPaidOut: { increment: actualReward },
            },
          });
        } else {
          // Referral pool empty — update burn count only, reward queued for later
          await tx.referral.updateMany({
            where: { referrerId: user.referredById, refereeId: userId },
            data: { totalBurns: { increment: 1 } },
          });
        }
      }

      return burnRecord;
    });

    // Update total_ash_emitted in platform config (outside main tx for performance)
    try {
      const currentEmitted = burnCfg.total_ash_emitted ?? 0;
      await prisma.platformConfig.upsert({
        where: { key: "total_ash_emitted" },
        update: { value: String(currentEmitted + ashReward) },
        create: { key: "total_ash_emitted", value: String(currentEmitted + ashReward) },
      });
    } catch {
      // Non-fatal — emission tracking is best-effort
    }

    // ---- CHECK IF ROUND SHOULD END (outside main tx to avoid nested tx issues) ----
    let roundEnded = false;
    let roundWinner: string | null = null;
    let roundPrize: number | null = null;
    let roundNumber: number | null = null;

    if (newRoundPool >= Number(activeRound.prizePoolTarget)) {
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

    // ---- GET USER'S CURRENT ROUND RANK + UPDATE ANTI-SNIPE TRACKER ----
    let userRoundRank: number | null = null;
    const prizePoolTarget = Number(activeRound.prizePoolTarget);
    const currentPool = newRoundPool;

    if (!roundEnded) {
      const leaderboard = await RoundService.getRoundLeaderboard(activeRound.id);
      const entry = leaderboard.find((e) => e.userId === userId);
      userRoundRank = entry?.rank ?? null;

      // req #8 — Anti-snipe: track who holds rank #1 and since when
      if (leaderboard.length > 0) {
        const newRank1UserId = leaderboard[0].userId;
        const currentRound = await prisma.round.findUnique({
          where: { id: activeRound.id },
          select: { rank1HolderId: true },
        });
        if (currentRound?.rank1HolderId !== newRank1UserId) {
          await prisma.round.update({
            where: { id: activeRound.id },
            data: { rank1HolderId: newRank1UserId, rank1SinceAt: new Date() },
          });
        }
      }
    }

    return {
      burnId:               burn.id,
      ashReward,
      weight:               baseWeight,
      finalWeight,
      userCumulativeWeight: newCumulativeWeight,
      emissionMultiplier,
      roundId:              activeRound.id,
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
