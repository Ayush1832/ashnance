import { prisma } from "../utils/prisma";
import {
  BadRequestError,
  InsufficientBalanceError,
  NotFoundError,
  TooManyRequestsError,
} from "../utils/errors";

export type BattleActionType = "ATTACK" | "SHIELD" | "COUNTER" | "BOOST" | "RECOVERY";

// ---- Tunable constants — kept in one place so gameplay balance can change
// without touching the transactional/audit code below. ----
const ASH_COST: Record<BattleActionType, number> = {
  ATTACK: 10,
  SHIELD: 8,
  COUNTER: 12,
  BOOST: 15,
  RECOVERY: 10,
};
const MIN_ATTACK_ASH = ASH_COST.ATTACK;
const MAX_ATTACK_ASH = 200; // caps how much a single attack can cost — prevents a whale one-shotting via raw ASH spend

const ACTION_COOLDOWN_MS = 30_000; // min gap between ANY two battle actions by the same actor in a pool
const BOOST_COOLDOWN_MS = 60 * 60 * 1000; // 1h — separate, longer cooldown just for BOOST
const SHIELD_DURATION_MS = 60 * 60 * 1000; // 1h
const SHIELD_ABSORB_PCT = 0.5; // shield absorbs 50% of incoming realized attack damage
const MAX_ATTACK_PCT_OF_DEFENDER_WEIGHT = 0.05; // hard cap — no single attack can remove >5% of defender weight
const ATTACK_DIMINISHING_WINDOW_MS = 24 * 60 * 60 * 1000; // repeat-target lookback window
const COUNTER_WINDOW_MS = 5 * 60 * 1000; // must counter within 5 min of being attacked
const COUNTER_REFLECT_PCT = 0.5; // reflects 50% of the damage just taken back onto the attacker
const COUNTER_SELF_HEAL_PCT = 0.5; // and heals the same fraction of that damage back to self
const RECOVERY_RESTORE_PCT = 0.5; // restores 50% of accumulated weightLostSinceRecovery
const BOOST_PCT = 0.05; // +5% of own current weight

/**
 * Pure function — computes an ATTACK's effect from inputs alone, so the
 * fairness formula can be tuned/tested in isolation from the DB transaction.
 */
export function calculateAttackEffect(params: {
  ashSpent: number;
  defenderWeight: number;
  priorAttacksOnTargetInWindow: number;
  defenderShielded: boolean;
  defenderShieldStrength: number; // 0..1
}): { rawWeightLoss: number; realizedWeightLoss: number } {
  const { ashSpent, defenderWeight, priorAttacksOnTargetInWindow, defenderShielded, defenderShieldStrength } = params;

  // Attack power scales with sqrt(ashSpent) — diminishing returns on overspending ASH,
  // same shape as the weight-cap diminishing returns used in BurnService.
  const ashPower = Math.sqrt(ashSpent);
  const basePct = Math.min(MAX_ATTACK_PCT_OF_DEFENDER_WEIGHT, 0.01 * ashPower);

  // Diminishing returns on repeat targeting: halve effect per prior attack on the
  // same target within the window, floored so it never hits exactly zero.
  const repeatMultiplier = Math.max(0.1, Math.pow(0.5, priorAttacksOnTargetInWindow));

  const rawWeightLoss = Math.max(0, defenderWeight) * basePct * repeatMultiplier;
  const realizedWeightLoss = defenderShielded
    ? rawWeightLoss * (1 - defenderShieldStrength)
    : rawWeightLoss;

  return { rawWeightLoss, realizedWeightLoss };
}

export interface BattleActionResult {
  actionType: BattleActionType;
  ashSpent: number;
  weightDelta: number;
  actorWeight: number;
  targetWeight?: number;
}

export class BattleService {
  static async performAction(
    userId: string,
    poolId: string,
    actionType: BattleActionType,
    opts: { targetUserId?: string; ashAmount?: number } = {}
  ): Promise<BattleActionResult> {
    const pool = await prisma.creatorPool.findUnique({ where: { id: poolId } });
    if (!pool) throw new NotFoundError("Pool not found");
    if (pool.status !== "ACTIVE") {
      throw new BadRequestError(`Battle actions are only allowed while the pool is ACTIVE (current: ${pool.status})`);
    }

    const actor = await prisma.creatorPoolParticipant.findUnique({
      where: { poolId_userId: { poolId, userId } },
    });
    if (!actor) {
      throw new BadRequestError("You must contribute to this pool before you can battle in it.");
    }

    const now = new Date();
    if (actor.lastActionAt && now.getTime() - actor.lastActionAt.getTime() < ACTION_COOLDOWN_MS) {
      const waitMs = ACTION_COOLDOWN_MS - (now.getTime() - actor.lastActionAt.getTime());
      throw new TooManyRequestsError(`Battle actions are rate-limited — wait ${Math.ceil(waitMs / 1000)}s.`);
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError("Wallet not found");

    switch (actionType) {
      case "ATTACK":
        return this.attack(pool.id, actor, opts, wallet);
      case "SHIELD":
        return this.shield(pool.id, actor, wallet);
      case "COUNTER":
        return this.counter(pool.id, actor, wallet);
      case "BOOST":
        return this.boost(pool.id, actor, wallet, now);
      case "RECOVERY":
        return this.recovery(pool.id, actor, wallet);
      default:
        throw new BadRequestError("Unknown battle action type");
    }
  }

  /**
   * Atomically claims the actor's cooldown slot(s) inside the caller's own
   * $transaction. The check in performAction() is a stale pre-transaction
   * snapshot — kept only as a fast, cheap rejection — but this updateMany
   * guard is the actual source of truth: two concurrent requests racing
   * through performAction's snapshot check will both attempt this claim, and
   * only the first to commit can succeed, since the WHERE clause requires
   * lastActionAt to still be outside the cooldown window at claim time.
   */
  private static async claimActionSlot(
    tx: any,
    poolId: string,
    userId: string,
    now: Date,
    opts: { boost?: boolean } = {}
  ): Promise<void> {
    const cutoff = new Date(now.getTime() - ACTION_COOLDOWN_MS);
    const where: any = {
      poolId,
      userId,
      OR: [{ lastActionAt: null }, { lastActionAt: { lt: cutoff } }],
    };
    const data: any = { lastActionAt: now };

    if (opts.boost) {
      const boostCutoff = new Date(now.getTime() - BOOST_COOLDOWN_MS);
      where.AND = [{ OR: [{ lastBoostAt: null }, { lastBoostAt: { lt: boostCutoff } }] }];
      data.lastBoostAt = now;
    }

    const claimed = await tx.creatorPoolParticipant.updateMany({ where, data });
    if (claimed.count === 0) {
      throw new TooManyRequestsError("Battle actions are rate-limited — please wait before acting again.");
    }
  }

  private static async attack(
    poolId: string,
    actor: { userId: string },
    opts: { targetUserId?: string; ashAmount?: number },
    wallet: { ashBalance: unknown }
  ): Promise<BattleActionResult> {
    if (!opts.targetUserId) throw new BadRequestError("ATTACK requires a targetUserId");
    if (opts.targetUserId === actor.userId) throw new BadRequestError("You cannot attack yourself");

    const ashSpent = opts.ashAmount ?? MIN_ATTACK_ASH;
    if (ashSpent < MIN_ATTACK_ASH || ashSpent > MAX_ATTACK_ASH) {
      throw new BadRequestError(`ATTACK ash spend must be between ${MIN_ATTACK_ASH} and ${MAX_ATTACK_ASH}`);
    }
    if (Number(wallet.ashBalance) < ashSpent) {
      throw new InsufficientBalanceError(`Insufficient ASH — need ${ashSpent}.`);
    }

    const target = await prisma.creatorPoolParticipant.findUnique({
      where: { poolId_userId: { poolId, userId: opts.targetUserId } },
    });
    if (!target) throw new NotFoundError("Target is not a participant in this pool");

    const since = new Date(Date.now() - ATTACK_DIMINISHING_WINDOW_MS);
    const priorAttacks = await prisma.battleEvent.count({
      where: { poolId, actorId: actor.userId, targetId: opts.targetUserId, actionType: "ATTACK", createdAt: { gte: since } },
    });

    const shielded = !!(target.shieldActiveUntil && target.shieldActiveUntil > new Date());
    const { realizedWeightLoss } = calculateAttackEffect({
      ashSpent,
      defenderWeight: Number(target.weight),
      priorAttacksOnTargetInWindow: priorAttacks,
      defenderShielded: shielded,
      defenderShieldStrength: shielded ? Number(target.shieldStrength ?? SHIELD_ABSORB_PCT) : 0,
    });

    const result = await prisma.$transaction(async (tx: any) => {
      const now = new Date();
      await this.claimActionSlot(tx, poolId, actor.userId, now);

      const debit = await tx.wallet.updateMany({
        where: { userId: actor.userId, ashBalance: { gte: ashSpent } },
        data: { ashBalance: { decrement: ashSpent } },
      });
      if (debit.count === 0) throw new InsufficientBalanceError(`Insufficient ASH — need ${ashSpent}.`);

      // Relative decrement (not an absolute write from the stale pre-transaction
      // read) so a concurrent action on the same target — another attack, a boost,
      // a fresh contribution — isn't clobbered by this one.
      const updatedTarget = await tx.creatorPoolParticipant.update({
        where: { poolId_userId: { poolId, userId: opts.targetUserId! } },
        data: {
          weight: { decrement: realizedWeightLoss },
          weightLostSinceRecovery: { increment: realizedWeightLoss },
          lastAttackedById: actor.userId,
          lastAttackedAt: now,
        },
      });
      if (Number(updatedTarget.weight) < 0) {
        await tx.creatorPoolParticipant.update({
          where: { poolId_userId: { poolId, userId: opts.targetUserId! } },
          data: { weight: 0 },
        });
        updatedTarget.weight = 0 as any;
      }

      const updatedActor = await tx.creatorPoolParticipant.findUnique({
        where: { poolId_userId: { poolId, userId: actor.userId } },
      });

      await tx.battleEvent.create({
        data: {
          poolId,
          actorId: actor.userId,
          targetId: opts.targetUserId,
          actionType: "ATTACK",
          ashSpent,
          weightDelta: -realizedWeightLoss,
          resultMeta: { priorAttacks, shielded },
        },
      });

      return { actorWeight: Number(updatedActor.weight), targetWeight: Number(updatedTarget.weight) };
    });

    return { actionType: "ATTACK", ashSpent, weightDelta: -realizedWeightLoss, ...result };
  }

  private static async shield(
    poolId: string,
    actor: { userId: string; weight: unknown },
    wallet: { ashBalance: unknown }
  ): Promise<BattleActionResult> {
    const ashSpent = ASH_COST.SHIELD;
    if (Number(wallet.ashBalance) < ashSpent) {
      throw new InsufficientBalanceError(`Insufficient ASH — need ${ashSpent}.`);
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const now = new Date();
      await this.claimActionSlot(tx, poolId, actor.userId, now);

      const debit = await tx.wallet.updateMany({
        where: { userId: actor.userId, ashBalance: { gte: ashSpent } },
        data: { ashBalance: { decrement: ashSpent } },
      });
      if (debit.count === 0) throw new InsufficientBalanceError(`Insufficient ASH — need ${ashSpent}.`);

      const updated = await tx.creatorPoolParticipant.update({
        where: { poolId_userId: { poolId, userId: actor.userId } },
        data: {
          shieldActiveUntil: new Date(now.getTime() + SHIELD_DURATION_MS),
          shieldStrength: SHIELD_ABSORB_PCT,
        },
      });

      await tx.battleEvent.create({
        data: { poolId, actorId: actor.userId, actionType: "SHIELD", ashSpent, weightDelta: 0 },
      });

      return { actorWeight: Number(updated.weight) };
    });

    return { actionType: "SHIELD", ashSpent, weightDelta: 0, ...result };
  }

  private static async counter(
    poolId: string,
    actor: { userId: string; lastAttackedById: string | null; lastAttackedAt: Date | null },
    wallet: { ashBalance: unknown }
  ): Promise<BattleActionResult> {
    const ashSpent = ASH_COST.COUNTER;
    if (Number(wallet.ashBalance) < ashSpent) {
      throw new InsufficientBalanceError(`Insufficient ASH — need ${ashSpent}.`);
    }
    if (!actor.lastAttackedById || !actor.lastAttackedAt || Date.now() - actor.lastAttackedAt.getTime() > COUNTER_WINDOW_MS) {
      throw new BadRequestError("COUNTER can only be used within 5 minutes of being attacked.");
    }

    const lastAttackEvent = await prisma.battleEvent.findFirst({
      where: { poolId, targetId: actor.userId, actorId: actor.lastAttackedById, actionType: "ATTACK" },
      orderBy: { createdAt: "desc" },
    });
    const baseDamage = lastAttackEvent ? Math.abs(Number(lastAttackEvent.weightDelta)) : 0;
    if (baseDamage <= 0) {
      throw new BadRequestError("No recent attack to counter.");
    }

    const attackerId = actor.lastAttackedById;
    const reflectDamage = baseDamage * COUNTER_REFLECT_PCT;
    const selfHeal = baseDamage * COUNTER_SELF_HEAL_PCT;

    const result = await prisma.$transaction(async (tx: any) => {
      const now = new Date();
      await this.claimActionSlot(tx, poolId, actor.userId, now);

      const debit = await tx.wallet.updateMany({
        where: { userId: actor.userId, ashBalance: { gte: ashSpent } },
        data: { ashBalance: { decrement: ashSpent } },
      });
      if (debit.count === 0) throw new InsufficientBalanceError(`Insufficient ASH — need ${ashSpent}.`);

      const attackerParticipant = await tx.creatorPoolParticipant.findUnique({
        where: { poolId_userId: { poolId, userId: attackerId } },
      });
      // Relative decrement — same reasoning as attack(): never write an absolute
      // value computed from a read taken before this transaction's own writes.
      let attackerNewWeight = 0;
      if (attackerParticipant) {
        const updatedAttacker = await tx.creatorPoolParticipant.update({
          where: { poolId_userId: { poolId, userId: attackerId } },
          data: { weight: { decrement: reflectDamage } },
        });
        attackerNewWeight = Number(updatedAttacker.weight);
        if (attackerNewWeight < 0) {
          await tx.creatorPoolParticipant.update({
            where: { poolId_userId: { poolId, userId: attackerId } },
            data: { weight: 0 },
          });
          attackerNewWeight = 0;
        }
      }

      const updatedActor = await tx.creatorPoolParticipant.update({
        where: { poolId_userId: { poolId, userId: actor.userId } },
        data: {
          weight: { increment: selfHeal },
          lastAttackedById: null,
          lastAttackedAt: null,
        },
      });

      await tx.battleEvent.create({
        data: {
          poolId,
          actorId: actor.userId,
          targetId: attackerId,
          actionType: "COUNTER",
          ashSpent,
          weightDelta: selfHeal,
          resultMeta: { reflectDamage, baseDamage },
        },
      });

      return { actorWeight: Number(updatedActor.weight), targetWeight: attackerNewWeight };
    });

    return { actionType: "COUNTER", ashSpent, weightDelta: selfHeal, ...result };
  }

  private static async boost(
    poolId: string,
    actor: { userId: string; weight: unknown; lastBoostAt: Date | null },
    wallet: { ashBalance: unknown },
    now: Date
  ): Promise<BattleActionResult> {
    const ashSpent = ASH_COST.BOOST;
    if (Number(wallet.ashBalance) < ashSpent) {
      throw new InsufficientBalanceError(`Insufficient ASH — need ${ashSpent}.`);
    }
    if (actor.lastBoostAt && now.getTime() - actor.lastBoostAt.getTime() < BOOST_COOLDOWN_MS) {
      const waitMs = BOOST_COOLDOWN_MS - (now.getTime() - actor.lastBoostAt.getTime());
      throw new TooManyRequestsError(`BOOST is on cooldown — wait ${Math.ceil(waitMs / 60000)}m.`);
    }

    const gain = Number(actor.weight) * BOOST_PCT;

    const result = await prisma.$transaction(async (tx: any) => {
      await this.claimActionSlot(tx, poolId, actor.userId, now, { boost: true });

      const debit = await tx.wallet.updateMany({
        where: { userId: actor.userId, ashBalance: { gte: ashSpent } },
        data: { ashBalance: { decrement: ashSpent } },
      });
      if (debit.count === 0) throw new InsufficientBalanceError(`Insufficient ASH — need ${ashSpent}.`);

      const updated = await tx.creatorPoolParticipant.update({
        where: { poolId_userId: { poolId, userId: actor.userId } },
        data: { weight: { increment: gain } },
      });

      await tx.battleEvent.create({
        data: { poolId, actorId: actor.userId, actionType: "BOOST", ashSpent, weightDelta: gain },
      });

      return { actorWeight: Number(updated.weight) };
    });

    return { actionType: "BOOST", ashSpent, weightDelta: gain, ...result };
  }

  private static async recovery(
    poolId: string,
    actor: { userId: string; weightLostSinceRecovery: unknown },
    wallet: { ashBalance: unknown }
  ): Promise<BattleActionResult> {
    const ashSpent = ASH_COST.RECOVERY;
    if (Number(wallet.ashBalance) < ashSpent) {
      throw new InsufficientBalanceError(`Insufficient ASH — need ${ashSpent}.`);
    }
    const available = Number(actor.weightLostSinceRecovery);
    if (available <= 0) {
      throw new BadRequestError("No recent battle losses to recover.");
    }
    const restore = available * RECOVERY_RESTORE_PCT;

    const result = await prisma.$transaction(async (tx: any) => {
      const now = new Date();
      await this.claimActionSlot(tx, poolId, actor.userId, now);

      const debit = await tx.wallet.updateMany({
        where: { userId: actor.userId, ashBalance: { gte: ashSpent } },
        data: { ashBalance: { decrement: ashSpent } },
      });
      if (debit.count === 0) throw new InsufficientBalanceError(`Insufficient ASH — need ${ashSpent}.`);

      const updated = await tx.creatorPoolParticipant.update({
        where: { poolId_userId: { poolId, userId: actor.userId } },
        data: {
          weight: { increment: restore },
          weightLostSinceRecovery: { decrement: restore },
        },
      });

      await tx.battleEvent.create({
        data: { poolId, actorId: actor.userId, actionType: "RECOVERY", ashSpent, weightDelta: restore },
      });

      return { actorWeight: Number(updated.weight) };
    });

    return { actionType: "RECOVERY", ashSpent, weightDelta: restore, ...result };
  }

  static async getBattleLog(poolId: string, limit = 50) {
    return prisma.battleEvent.findMany({
      where: { poolId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        actor: { select: { username: true } },
        target: { select: { username: true } },
      },
    });
  }
}
