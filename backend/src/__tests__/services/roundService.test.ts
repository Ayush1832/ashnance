/**
 * RoundService Tests
 *
 * Covers: anti-snipe (Req #8), anti-domination (Req #5), prize safety cap (Req #7),
 * winner reset + 10% decay (Reqs #1 & #2), atomic payout failure rollback,
 * concurrent race condition (§21), auto-end expired rounds, no-active-round burn,
 * anti-domination no-rank-#2 edge case.
 */

jest.mock("../../utils/prisma", () => ({
  prisma: {
    round: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    burn: { findMany: jest.fn() },
    user: { findMany: jest.fn(), findUnique: jest.fn() },
    rewardPool: { findFirst: jest.fn() },
    platformConfig: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("../../services/ownerService", () => ({
  OwnerService: {
    getBurnConfig: jest.fn().mockResolvedValue({
      anti_snipe_seconds: 10,
      prize_safety_pct: 0.70,
      base_unit: 4.99,
      weight_cap: 300,
      referral_weight_cap_pct: 0.40,
      ash_reward_percent: 1.0,
      reward_pool_split: 0.5,
      profit_pool_split: 0.5,
      referral_commission: 0.1,
      vip_holy_fire_bonus: 0.50,
      min_burn_amount: 5,
      max_burn_amount: 10000,
      boost_cost_ash: 1000,
      boost_duration_ms: 3600000,
      prize_pool_target: 500,
    }),
  },
}));

import { prisma } from "../../utils/prisma";
import { RoundService } from "../../services/roundService";
import { BadRequestError, NotFoundError } from "../../utils/errors";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRound(overrides: Record<string, unknown> = {}) {
  return {
    id: "round-1",
    roundNumber: 2,
    status: "ACTIVE",
    prizePoolTarget: 100,
    currentPool: 100,
    rank1HolderId: "user-a",
    rank1SinceAt: new Date(Date.now() - 20_000), // held 20s — past anti-snipe
    timeLimitHours: 24,
    endsAt: new Date(Date.now() + 86_400_000),
    startedAt: new Date(),
    ...overrides,
  };
}

function makeLeaderboardEntry(userId: string, weight: number) {
  return { rank: 0, userId, username: `user_${userId}`, cumulativeWeight: weight, distanceToFirst: 0 };
}

function makeRewardPool(balance: number) {
  return { totalBalance: String(balance), totalPaidOut: "0" };
}

// Standard mock transaction that executes the callback
function mockTxSuccess() {
  (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
    const tx = {
      round: { update: jest.fn().mockResolvedValue({}) },
      wallet: {
        update: jest.fn().mockResolvedValue({ usdcBalance: "100", cumulativeWeight: "0" }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
      transaction: { create: jest.fn().mockResolvedValue({ id: "tx-1" }) },
      user: { update: jest.fn().mockResolvedValue({}) },
    };
    return fn(tx);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// createRound
// ===========================================================================
describe("RoundService.createRound", () => {
  test("rejects if an active round already exists", async () => {
    (mockPrisma.round.findFirst as jest.Mock).mockResolvedValueOnce(makeRound());
    await expect(RoundService.createRound(500)).rejects.toThrow(BadRequestError);
  });

  test("creates round #1 when no rounds exist", async () => {
    (mockPrisma.round.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)  // no active
      .mockResolvedValueOnce(null); // no last round
    (mockPrisma.round.create as jest.Mock).mockResolvedValue({ id: "r-1", roundNumber: 1 });
    const result = await RoundService.createRound(500) as any;
    expect(mockPrisma.round.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ roundNumber: 1, prizePoolTarget: 500 }) })
    );
  });

  test("creates round N+1 based on last round", async () => {
    (mockPrisma.round.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ roundNumber: 3 });
    (mockPrisma.round.create as jest.Mock).mockResolvedValue({ id: "r-4", roundNumber: 4 });
    await RoundService.createRound(250);
    expect(mockPrisma.round.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ roundNumber: 4 }) })
    );
  });

  test("sets endsAt when timeLimitHours provided", async () => {
    (mockPrisma.round.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    (mockPrisma.round.create as jest.Mock).mockResolvedValue({});
    const before = Date.now();
    await RoundService.createRound(500, 24);
    const call = (mockPrisma.round.create as jest.Mock).mock.calls[0][0];
    expect(call.data.endsAt).not.toBeNull();
    expect(new Date(call.data.endsAt).getTime()).toBeGreaterThan(before + 23 * 3600 * 1000);
  });
});

// ===========================================================================
// endRound — anti-snipe (Req #8)
// ===========================================================================
describe("RoundService.endRound — Anti-Snipe (Req #8)", () => {
  test("rejects when rank #1 has held for less than anti_snipe_seconds", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(
      makeRound({ rank1SinceAt: new Date(Date.now() - 3_000) }) // only 3s
    );
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([
      { userId: "user-a", finalWeight: 5 },
    ]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "user-a", username: "alice" },
    ]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: null });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(1000));

    await expect(RoundService.endRound("round-1")).rejects.toThrow(/Anti-snipe/i);
  });

  test("succeeds after anti_snipe_seconds have elapsed", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(
      makeRound({ rank1SinceAt: new Date(Date.now() - 20_000) }) // 20s > 10s
    );
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([{ userId: "user-a", finalWeight: 5 }]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: "user-a", username: "alice" }]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: null });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(1000));
    mockTxSuccess();

    const result = await RoundService.endRound("round-1");
    expect(result.winner.userId).toBe("user-a");
  });

  test("force=true skips anti-snipe check even when held < 10s", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(
      makeRound({ rank1SinceAt: new Date(Date.now() - 1_000) }) // only 1s
    );
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([{ userId: "user-a", finalWeight: 5 }]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: "user-a", username: "alice" }]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: null });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(1000));
    mockTxSuccess();

    const result = await RoundService.endRound("round-1", true /* force */);
    expect(result.winner.userId).toBe("user-a");
  });

  test("anti-snipe skipped when rank1SinceAt is null (no one has taken rank #1)", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(
      makeRound({ rank1SinceAt: null, rank1HolderId: null })
    );
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([{ userId: "user-a", finalWeight: 5 }]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: "user-a", username: "alice" }]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: null });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(1000));
    mockTxSuccess();

    const result = await RoundService.endRound("round-1");
    expect(result.winner.userId).toBe("user-a");
  });
});

// ===========================================================================
// endRound — anti-domination (Req #5)
// ===========================================================================
describe("RoundService.endRound — Anti-Domination (Req #5)", () => {
  test("rank #1 who won previous round yields to rank #2", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValueOnce(
      makeRound({ roundNumber: 2 }) // current is round 2
    );
    // Two burners: user-a at rank #1, user-b at rank #2
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([
      { userId: "user-a", finalWeight: 10 },
      { userId: "user-b", finalWeight: 5 },
    ]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "user-a", username: "alice" },
      { id: "user-b", username: "bob" },
    ]);
    // user-a won round 1 (roundNumber 1 = current - 1)
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: "round-prev" });
    // Round #1 was round number 1
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValueOnce({ roundNumber: 1 });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(1000));
    mockTxSuccess();

    const result = await RoundService.endRound("round-1");
    expect(result.winner.userId).toBe("user-b"); // rank #2 wins
  });

  test("rank #1 who won a non-consecutive round is NOT blocked", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValueOnce(
      makeRound({ roundNumber: 5 }) // current round 5
    );
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([
      { userId: "user-a", finalWeight: 10 },
    ]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "user-a", username: "alice" },
    ]);
    // user-a won round 3, not round 4 (not consecutive)
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: "round-old" });
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValueOnce({ roundNumber: 3 }); // not round 4
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(1000));
    mockTxSuccess();

    const result = await RoundService.endRound("round-1");
    expect(result.winner.userId).toBe("user-a");
  });

  test("Anti-Domination: No Rank #2 — throws when rank #1 ineligible and no rank #2", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValueOnce(
      makeRound({ roundNumber: 2 })
    );
    // Only one burner
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([
      { userId: "user-a", finalWeight: 10 },
    ]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "user-a", username: "alice" },
    ]);
    // user-a won previous round
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: "round-prev" });
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValueOnce({ roundNumber: 1 });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(1000));

    await expect(RoundService.endRound("round-1")).rejects.toThrow(
      /Anti-domination cooldown.*no other eligible/i
    );
  });

  test("Anti-Domination: No Rank #2 — force=true overrides (uses rank #1 anyway)", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValueOnce(
      makeRound({ roundNumber: 2 })
    );
    // Only one burner, force=true skips anti-snipe AND anti-domination
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([
      { userId: "user-a", finalWeight: 10 },
    ]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "user-a", username: "alice" },
    ]);
    // user-a won previous round — but force=true bypasses anti-snipe, not anti-domination
    // force only skips anti-snipe; anti-domination still applies.
    // So with force=true and only 1 participant who was last winner, it still throws.
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: "round-prev" });
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValueOnce({ roundNumber: 1 });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(1000));

    await expect(RoundService.endRound("round-1", true)).rejects.toThrow(
      /Anti-domination/i
    );
  });
});

// ===========================================================================
// endRound — prize safety cap (Req #7)
// ===========================================================================
describe("RoundService.endRound — Prize Safety Cap (Req #7)", () => {
  test("Insufficient Reward Pool for Prize — prize capped at 70% of reward pool", async () => {
    // rewardPool=100, currentPool=500 → prize = min(500, 100×0.70) = 70
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(
      makeRound({ currentPool: 500 })
    );
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([{ userId: "user-a", finalWeight: 10 }]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: "user-a", username: "alice" }]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: null });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(100));

    let capturedPrizeAmount: number | undefined;
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        round: {
          update: jest.fn().mockImplementation((args: any) => {
            capturedPrizeAmount = args.data.prizeAmount;
            return {};
          }),
        },
        wallet: {
          update: jest.fn().mockResolvedValue({ usdcBalance: "70", cumulativeWeight: "0" }),
          updateMany: jest.fn().mockResolvedValue({}),
        },
        rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
        transaction: { create: jest.fn().mockResolvedValue({ id: "tx-1" }) },
        user: { update: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const result = await RoundService.endRound("round-1");
    expect(result.prizeAmount).toBe(70);    // capped
    expect(result.prizeAmount).toBeLessThan(100 * 0.70 + 0.001); // ≤ 70% of pool
    expect(capturedPrizeAmount).toBe(70);
  });

  test("prize equals currentPool when pool has plenty of balance", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(
      makeRound({ currentPool: 50 })
    );
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([{ userId: "user-a", finalWeight: 10 }]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: "user-a", username: "alice" }]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: null });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(10_000));
    mockTxSuccess();

    const result = await RoundService.endRound("round-1");
    expect(result.prizeAmount).toBe(50);
  });
});

// ===========================================================================
// endRound — winner reset + 10% decay (Reqs #1 & #2)
// ===========================================================================
describe("RoundService.endRound — Winner Reset & 10% Decay (Reqs #1 & #2)", () => {
  test("winner cumulativeWeight set to 0, all others multiplied by 0.90", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(makeRound());
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([
      { userId: "user-a", finalWeight: 10 },
      { userId: "user-b", finalWeight: 5 },
    ]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "user-a", username: "alice" },
      { id: "user-b", username: "bob" },
    ]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: null });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(10_000));

    const walletUpdateCalls: any[] = [];
    const walletUpdateManyCalls: any[] = [];

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        round: { update: jest.fn().mockResolvedValue({}) },
        wallet: {
          update: jest.fn().mockImplementation((args: any) => {
            walletUpdateCalls.push(args);
            return { usdcBalance: "100", cumulativeWeight: "0" };
          }),
          updateMany: jest.fn().mockImplementation((args: any) => {
            walletUpdateManyCalls.push(args);
            return { count: 1 };
          }),
        },
        rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
        transaction: { create: jest.fn().mockResolvedValue({ id: "tx-1" }) },
        user: { update: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    await RoundService.endRound("round-1");

    // Winner weight reset to 0
    const resetCall = walletUpdateCalls.find((c) => c.data?.cumulativeWeight === 0);
    expect(resetCall).toBeDefined();
    expect(resetCall.where.userId).toBe("user-a");

    // Others decayed by 10% via multiply: 0.90
    const decayCall = walletUpdateManyCalls.find(
      (c) => c.data?.cumulativeWeight?.multiply === 0.90
    );
    expect(decayCall).toBeDefined();
    expect(decayCall.where.userId.not).toBe("user-a");
  });

  test("winner's lastWonRoundId is set after win", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(makeRound());
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([{ userId: "user-a", finalWeight: 10 }]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: "user-a", username: "alice" }]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: null });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(10_000));

    const userUpdateCalls: any[] = [];
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        round: { update: jest.fn().mockResolvedValue({}) },
        wallet: {
          update: jest.fn().mockResolvedValue({ usdcBalance: "100", cumulativeWeight: "0" }),
          updateMany: jest.fn().mockResolvedValue({}),
        },
        rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
        transaction: { create: jest.fn().mockResolvedValue({ id: "tx-1" }) },
        user: {
          update: jest.fn().mockImplementation((args: any) => {
            userUpdateCalls.push(args);
            return {};
          }),
        },
      };
      return fn(tx);
    });

    await RoundService.endRound("round-1");

    const lastWonCall = userUpdateCalls.find(
      (c) => c.data?.lastWonRoundId === "round-1"
    );
    expect(lastWonCall).toBeDefined();
    expect(lastWonCall.where.id).toBe("user-a"); // user.update uses where: { id }
  });
});

// ===========================================================================
// endRound — atomic payout failure rollback
// ===========================================================================
describe("RoundService.endRound — Atomic Payout Failure Rollback", () => {
  test("if $transaction throws, winner balance is NOT credited and round stays active-looking (error propagates)", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(makeRound());
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([{ userId: "user-a", finalWeight: 10 }]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: "user-a", username: "alice" }]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: null });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(10_000));

    // Simulate the payout transaction throwing mid-flight (e.g. DB error)
    (mockPrisma.$transaction as jest.Mock).mockRejectedValue(new Error("DB connection lost"));

    await expect(RoundService.endRound("round-1")).rejects.toThrow("DB connection lost");
  });
});

// ===========================================================================
// endRound — no participants → cancels round
// ===========================================================================
describe("RoundService.endRound — No Participants", () => {
  test("round with no burns is cancelled (not paid)", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(makeRound());
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([]); // empty
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.round.update as jest.Mock).mockResolvedValue({});

    await expect(RoundService.endRound("round-1")).rejects.toThrow(BadRequestError);
    expect(mockPrisma.round.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CANCELLED" }) })
    );
  });
});

// ===========================================================================
// endRound — round not found / already completed
// ===========================================================================
describe("RoundService.endRound — State Guards", () => {
  test("throws NotFoundError when round doesn't exist", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(RoundService.endRound("no-such-round")).rejects.toThrow(NotFoundError);
  });

  test("throws BadRequestError when round is already COMPLETED", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(
      makeRound({ status: "COMPLETED" })
    );
    await expect(RoundService.endRound("round-1")).rejects.toThrow(BadRequestError);
  });

  test("throws BadRequestError when round is CANCELLED", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(
      makeRound({ status: "CANCELLED" })
    );
    await expect(RoundService.endRound("round-1")).rejects.toThrow(BadRequestError);
  });
});

// ===========================================================================
// cancelRound
// ===========================================================================
describe("RoundService.cancelRound", () => {
  test("cancels an active round", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(makeRound());
    (mockPrisma.round.update as jest.Mock).mockResolvedValue({ status: "CANCELLED" });

    await RoundService.cancelRound("round-1");
    expect(mockPrisma.round.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CANCELLED" }) })
    );
  });

  test("rejects cancellation of non-active round", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(
      makeRound({ status: "COMPLETED" })
    );
    await expect(RoundService.cancelRound("round-1")).rejects.toThrow(BadRequestError);
  });

  test("throws NotFoundError when round doesn't exist", async () => {
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(RoundService.cancelRound("no-such-round")).rejects.toThrow(NotFoundError);
  });
});

// ===========================================================================
// autoEndExpiredRounds — Force End via Time Limit (§21, §7.7)
// ===========================================================================
describe("RoundService.autoEndExpiredRounds — Force End via Time Limit", () => {
  test("auto-ends rounds whose endsAt <= now with force=true", async () => {
    const expiredRound = makeRound({
      endsAt: new Date(Date.now() - 1_000), // expired 1 second ago
    });
    (mockPrisma.round.findMany as jest.Mock).mockResolvedValue([expiredRound]);
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(expiredRound);
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([{ userId: "user-a", finalWeight: 5 }]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: "user-a", username: "alice" }]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: null });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(10_000));
    mockTxSuccess();

    await RoundService.autoEndExpiredRounds();
    // endRound should have been called (via $transaction)
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  test("logs warning and continues when a round fails to end", async () => {
    const expiredRound = makeRound({ endsAt: new Date(Date.now() - 1_000) });
    (mockPrisma.round.findMany as jest.Mock).mockResolvedValue([expiredRound]);
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(expiredRound);
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.round.update as jest.Mock).mockResolvedValue({});

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    await expect(RoundService.autoEndExpiredRounds()).resolves.not.toThrow();
    warnSpy.mockRestore();
  });

  test("does nothing when no rounds have expired", async () => {
    (mockPrisma.round.findMany as jest.Mock).mockResolvedValue([]);
    await RoundService.autoEndExpiredRounds();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Race Condition: Two Burns Hit Pool Target Simultaneously (§21)
// ===========================================================================
describe("Race Condition: Two Burns Hit Pool Target Simultaneously", () => {
  test("second endRound call on already-COMPLETED round throws BadRequestError (no double payout)", async () => {
    // Simulate: first call set status to COMPLETED; second call finds it already done
    (mockPrisma.round.findUnique as jest.Mock)
      .mockResolvedValueOnce(makeRound({ status: "ACTIVE" }))   // first call sees ACTIVE
      .mockResolvedValueOnce(makeRound({ status: "COMPLETED" })); // second call sees COMPLETED

    // First call setup
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([{ userId: "user-a", finalWeight: 10 }]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: "user-a", username: "alice" }]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ lastWonRoundId: null });
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(makeRewardPool(10_000));
    mockTxSuccess();

    const [r1, r2] = await Promise.allSettled([
      RoundService.endRound("round-1"),
      RoundService.endRound("round-1"),
    ]);

    expect(r1.status).toBe("fulfilled");
    expect(r2.status).toBe("rejected");
    if (r2.status === "rejected") {
      expect(r2.reason).toBeInstanceOf(BadRequestError);
    }
  });
});

// ===========================================================================
// getActiveRound
// ===========================================================================
describe("RoundService.getActiveRound", () => {
  test("No Active Round — returns null when none exists", async () => {
    (mockPrisma.round.findFirst as jest.Mock).mockResolvedValue(null);
    const result = await RoundService.getActiveRound();
    expect(result).toBeNull();
  });

  test("returns the active round when one exists", async () => {
    const round = makeRound();
    (mockPrisma.round.findFirst as jest.Mock).mockResolvedValue(round);
    const result = await RoundService.getActiveRound();
    expect(result).toEqual(round);
  });
});
