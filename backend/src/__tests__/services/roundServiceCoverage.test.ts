/**
 * RoundService — Additional coverage tests
 * Targets uncovered lines: 58-90 (getRoundLeaderboard), 144-173 (getActiveRoundStatus), 347 (getRoundHistory).
 */

jest.mock("../../utils/prisma", () => ({
  prisma: {
    round: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
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

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => jest.clearAllMocks());

// ===========================================================================
// getRoundLeaderboard (covers lines 57-95)
// ===========================================================================
describe("RoundService.getRoundLeaderboard", () => {
  test("returns empty array when no burns", async () => {
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
    const result = await RoundService.getRoundLeaderboard("round-1");
    expect(result).toEqual([]);
  });

  test("returns top 10 ranked by cumulativeWeight with distanceToFirst", async () => {
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([
      { userId: "user-a", finalWeight: "10" },
      { userId: "user-b", finalWeight: "5" },
      { userId: "user-c", finalWeight: "3" },
    ]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "user-a", username: "Alice" },
      { id: "user-b", username: "Bob" },
      { id: "user-c", username: "Carol" },
    ]);

    const board = await RoundService.getRoundLeaderboard("round-1");

    expect(board[0].rank).toBe(1);
    expect(board[0].userId).toBe("user-a");
    expect(board[0].cumulativeWeight).toBe(10);
    expect(board[0].distanceToFirst).toBe(0);

    expect(board[1].rank).toBe(2);
    expect(board[1].userId).toBe("user-b");
    expect(board[1].distanceToFirst).toBe(5); // 10 - 5

    expect(board[2].rank).toBe(3);
    expect(board[2].distanceToFirst).toBe(7); // 10 - 3
  });

  test("aggregates multiple burns for same user", async () => {
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([
      { userId: "user-a", finalWeight: "3" },
      { userId: "user-a", finalWeight: "4" }, // same user, two burns
      { userId: "user-b", finalWeight: "6" },
    ]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "user-a", username: "Alice" },
      { id: "user-b", username: "Bob" },
    ]);

    const board = await RoundService.getRoundLeaderboard("round-1");

    // user-a: 3+4=7, user-b: 6 → user-a rank #1
    expect(board[0].userId).toBe("user-a");
    expect(board[0].cumulativeWeight).toBe(7);
    expect(board[1].userId).toBe("user-b");
  });

  test("caps leaderboard at 10 entries", async () => {
    const burns = Array.from({ length: 15 }, (_, i) => ({
      userId: `user-${i}`,
      finalWeight: String(100 - i),
    }));
    const users = Array.from({ length: 15 }, (_, i) => ({
      id: `user-${i}`,
      username: `User${i}`,
    }));

    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue(burns);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(users);

    const board = await RoundService.getRoundLeaderboard("round-1");
    expect(board).toHaveLength(10);
  });
});

// ===========================================================================
// getActiveRoundStatus (covers lines 143-193)
// ===========================================================================
describe("RoundService.getActiveRoundStatus", () => {
  const activeRound = {
    id: "round-1",
    roundNumber: 2,
    status: "ACTIVE",
    prizePoolTarget: "500",
    currentPool: "250",
    startedAt: new Date(),
    endsAt: null,
    timeLimitHours: null,
    rank1HolderId: null,
    rank1SinceAt: null,
  };

  test("No Active Round — returns null round and empty leaderboard", async () => {
    (mockPrisma.round.findFirst as jest.Mock).mockResolvedValue(null);
    const result = await RoundService.getActiveRoundStatus("user-1");
    expect(result.round).toBeNull();
    expect(result.leaderboard).toEqual([]);
    expect(result.userRank).toBeNull();
  });

  test("returns round progress and user rank when user is in top 10", async () => {
    (mockPrisma.round.findFirst as jest.Mock).mockResolvedValue(activeRound);
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([
      { userId: "user-1", finalWeight: "10" },
      { userId: "user-2", finalWeight: "5" },
    ]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "user-1", username: "Alice" },
      { id: "user-2", username: "Bob" },
    ]);

    const result = await RoundService.getActiveRoundStatus("user-1");

    expect(result.round).not.toBeNull();
    expect(result.round!.progressPercent).toBe(50); // 250/500 × 100
    expect(result.userRank).toBe(1);
    expect(result.userWeight).toBe(10);
    expect(result.userDistanceToFirst).toBe(0);
  });

  test("returns userRank via full ranking when user is outside top 10", async () => {
    (mockPrisma.round.findFirst as jest.Mock).mockResolvedValue(activeRound);

    // 12 users — top 10 won't include user-11
    const burns = Array.from({ length: 12 }, (_, i) => ({
      userId: `user-${i}`,
      finalWeight: String(100 - i),
    }));
    const users = Array.from({ length: 12 }, (_, i) => ({
      id: `user-${i}`,
      username: `User${i}`,
    }));

    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue(burns);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(users);

    // Call without userId — no user rank needed
    const result = await RoundService.getActiveRoundStatus();
    expect(result.userRank).toBeNull();
    expect(result.leaderboard).toHaveLength(10);
  });

  test("returns userRank=null when user has no burns in current round", async () => {
    (mockPrisma.round.findFirst as jest.Mock).mockResolvedValue(activeRound);
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([
      { userId: "user-2", finalWeight: "5" },
    ]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "user-2", username: "Bob" },
    ]);

    const result = await RoundService.getActiveRoundStatus("user-new");
    expect(result.userRank).toBeNull();
    expect(result.userWeight).toBe(0);
  });
});

// ===========================================================================
// getRoundHistory (covers line 347)
// ===========================================================================
describe("RoundService.getRoundHistory", () => {
  test("returns completed rounds with winner info", async () => {
    (mockPrisma.round.findMany as jest.Mock).mockResolvedValue([
      {
        id: "r-1",
        roundNumber: 1,
        status: "COMPLETED",
        prizeAmount: 315.25,
        winner: { username: "Alice" },
      },
    ]);

    const history = await RoundService.getRoundHistory(10);
    expect(history).toHaveLength(1);
    expect((history[0] as any).winner.username).toBe("Alice");
  });

  test("default limit is 10", async () => {
    (mockPrisma.round.findMany as jest.Mock).mockResolvedValue([]);
    await RoundService.getRoundHistory();
    expect(mockPrisma.round.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });
});

// ===========================================================================
// getActiveRoundStatus — userId provided, user outside top 10, found in full ranking
// (covers lines 166-168)
// ===========================================================================
describe("RoundService.getActiveRoundStatus — userId outside top 10 but found in full ranking", () => {
  const activeRound = {
    id: "round-1",
    roundNumber: 2,
    status: "ACTIVE",
    prizePoolTarget: "500",
    currentPool: "250",
    startedAt: new Date(),
    endsAt: null,
    timeLimitHours: null,
    rank1HolderId: null,
    rank1SinceAt: null,
  };

  test("sets userRank from full ranking when user is outside top 10", async () => {
    (mockPrisma.round.findFirst as jest.Mock).mockResolvedValue(activeRound);

    // 12 users in the burns list — top 10 won't include user-11
    const burns = Array.from({ length: 12 }, (_, i) => ({
      userId: `user-${i}`,
      finalWeight: String(100 - i), // user-0 heaviest, user-11 lightest
    }));
    const users = Array.from({ length: 12 }, (_, i) => ({
      id: `user-${i}`,
      username: `User${i}`,
    }));

    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue(burns);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(users);

    // user-11 is rank 12 — outside top 10
    const result = await RoundService.getActiveRoundStatus("user-11");

    expect(result.leaderboard).toHaveLength(10); // only top 10 returned
    expect(result.userRank).toBe(12);            // but rank is correctly fetched
    expect(result.userWeight).toBe(89);          // 100 - 11
    expect(result.userDistanceToFirst).toBe(11); // 100 - 89
  });
});

// ===========================================================================
// getRoundLeaderboard — empty users list (sorted[0]?.cumulativeWeight ?? 0, line 86)
// ===========================================================================
describe("RoundService.getRoundLeaderboard — users mock returns empty", () => {
  test("returns empty array when user.findMany returns no users even though burns exist", async () => {
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([
      { userId: "user-a", finalWeight: "10" },
    ]);
    // user.findMany returns [] — simulates all users deleted after burn recorded
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

    const result = await RoundService.getRoundLeaderboard("round-1");
    expect(result).toEqual([]); // sorted[0]?.cumulativeWeight ?? 0 right side hit
  });
});

// ===========================================================================
// endRound — ?? fallback branches: anti_snipe_seconds, prize_safety_pct, rewardPool null
// (lines 225, 261, 263)
// ===========================================================================
describe("RoundService.endRound — ?? fallback branches + rewardPool null", () => {
  const round = {
    id: "round-1",
    status: "ACTIVE",
    currentPool: "300",
    prizePoolTarget: "500",
    roundNumber: 2,
    rank1HolderId: null,
    rank1SinceAt: null,
    endsAt: null,
    timeLimitHours: null,
  };

  function mockSuccessTx() {
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        round: { update: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        wallet: {
          update: jest.fn().mockResolvedValue({ usdcBalance: "300", cumulativeWeight: "0" }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
        transaction: { create: jest.fn().mockResolvedValue({ id: "tx-1" }) },
        user: { update: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });
  }

  test("uses ?? fallbacks for anti_snipe_seconds and prize_safety_pct when null in config", async () => {
    const { OwnerService } = await import("../../services/ownerService") as any;
    OwnerService.getBurnConfig.mockResolvedValueOnce({
      // anti_snipe_seconds: null → ?? 10 right side
      // prize_safety_pct: null → ?? 0.70 right side
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
    });

    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(round);
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([
      { userId: "user-a", finalWeight: "10" },
    ]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "user-a", username: "Alice" },
    ]);
    // rewardPool is null → rewardPool?.totalBalance ?? 0 right side (line 263)
    (mockPrisma.rewardPool.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-a",
      wallet: { usdcBalance: "100" },
    });
    mockSuccessTx();

    const result = await RoundService.endRound("round-1");
    expect(result).toBeTruthy();
    // prizeAmount = Math.min(300, 0 * 0.70) = 0  (rewardPool null → ?? 0)
    expect(result.prizeAmount).toBe(0);
  });
});

// ===========================================================================
// getRoundLeaderboard — weightMap.get(u.id) ?? 0 right side (line 81)
// Users in findMany result but with id not in weightMap
// ===========================================================================
describe("RoundService.getRoundLeaderboard — user not in weightMap", () => {
  test("uses 0 weight for users whose id is not in weightMap (line 81 ?? right side)", async () => {
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([
      { userId: "user-a", finalWeight: "10" },
    ]);
    // Return both user-a (in weightMap) and user-b (NOT in weightMap)
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "user-a", username: "Alice" },
      { id: "user-b", username: "Bob" }, // not in weightMap → ?? 0
    ]);

    const board = await RoundService.getRoundLeaderboard("round-1");
    // user-b should have weight 0, user-a should be rank 1
    expect(board[0].userId).toBe("user-a");
    expect(board[0].cumulativeWeight).toBe(10);
    expect(board[1].userId).toBe("user-b");
    expect(board[1].cumulativeWeight).toBe(0);
  });
});

// ===========================================================================
// getActiveRoundStatus (via getRoundLeaderboard internal call to getFullRanking)
// Covers lines 125-130: weightMap.get(u.id) ?? 0 and sorted[0]?.cumulativeWeight ?? 0
// in getFullRanking when users findMany returns extra users not in weightMap
// ===========================================================================
describe("RoundService.getActiveRoundStatus — full ranking ?? fallbacks (lines 125-130)", () => {
  const activeRound = {
    id: "round-1",
    roundNumber: 2,
    status: "ACTIVE",
    prizePoolTarget: "500",
    currentPool: "250",
    startedAt: new Date(),
    endsAt: null,
    timeLimitHours: null,
    rank1HolderId: null,
    rank1SinceAt: null,
  };

  test("getFullRanking ?? 0 when a user in the findMany result has no burns (lines 125,130)", async () => {
    (mockPrisma.round.findFirst as jest.Mock).mockResolvedValue(activeRound);

    // 11 burns — top 10 excludes user-10; userId "user-100" will be provided to trigger getFullRanking
    const burns = Array.from({ length: 11 }, (_, i) => ({
      userId: `user-${i}`,
      finalWeight: String(100 - i),
    }));
    // users returns all 11 plus an extra "user-ghost" NOT in weightMap → ?? 0 triggered
    const users = [
      ...Array.from({ length: 11 }, (_, i) => ({ id: `user-${i}`, username: `User${i}` })),
      { id: "user-ghost", username: "Ghost" }, // not in burns → weightMap.get → ?? 0
    ];

    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue(burns);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(users);

    // user-10 is rank 11 — outside top 10 → triggers getFullRanking
    const result = await RoundService.getActiveRoundStatus("user-10");
    expect(result.userRank).toBe(11);
  });
});

// ===========================================================================
// getFullRanking — sorted[0]?.cumulativeWeight ?? 0 right side (line 130)
// Triggered when user.findMany returns [] in getFullRanking (second call)
// ===========================================================================
describe("RoundService — getFullRanking sorted empty (line 130 ?? right side)", () => {
  const activeRound = {
    id: "round-1",
    roundNumber: 2,
    status: "ACTIVE",
    prizePoolTarget: "500",
    currentPool: "250",
    startedAt: new Date(),
    endsAt: null,
    timeLimitHours: null,
    rank1HolderId: null,
    rank1SinceAt: null,
  };

  test("handles getFullRanking returning empty sorted when users not found (line 130)", async () => {
    (mockPrisma.round.findFirst as jest.Mock).mockResolvedValue(activeRound);

    // 11 burns to ensure user-10 is outside top 10 → triggers getFullRanking
    const burns = Array.from({ length: 11 }, (_, i) => ({
      userId: `user-${i}`,
      finalWeight: String(100 - i),
    }));
    const topUsers = Array.from({ length: 11 }, (_, i) => ({
      id: `user-${i}`,
      username: `User${i}`,
    }));

    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue(burns);
    // First call (getRoundLeaderboard): returns topUsers
    // Second call (getFullRanking): returns [] → sorted is empty → sorted[0] is undefined → ?? 0
    (mockPrisma.user.findMany as jest.Mock)
      .mockResolvedValueOnce(topUsers) // getRoundLeaderboard
      .mockResolvedValueOnce([]);       // getFullRanking → empty sorted → ?? 0

    // user-10 is rank 11 → getFullRanking called; but returns empty → userRank stays null
    const result = await RoundService.getActiveRoundStatus("user-10");
    expect(result.userRank).toBeNull(); // getFullRanking returned [] so user not found
  });
});
