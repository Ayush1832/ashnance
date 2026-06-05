/**
 * BurnService — Additional coverage tests
 * Targets uncovered lines: 227-231 (active round), 262-285 (referral),
 * 300-308 (round end trigger), 323-335 (anti-snipe tracker), 371-407 (history/stats).
 */

jest.mock("../../utils/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    user: { findUnique: jest.fn() },
    wallet: { findUnique: jest.fn(), update: jest.fn() },
    burn: { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
    transaction: { create: jest.fn() },
    rewardPool: { updateMany: jest.fn() },
    profitPool: { updateMany: jest.fn() },
    referralPool: { updateMany: jest.fn(), findFirst: jest.fn() },
    round: { findFirst: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    referral: { updateMany: jest.fn() },
    platformConfig: { upsert: jest.fn() },
  },
}));

jest.mock("../../services/blockchainService", () => ({
  BlockchainService: { simulateVRF: jest.fn().mockReturnValue(BigInt(99)) },
}));

jest.mock("../../services/ownerService", () => ({
  OwnerService: {
    getBurnConfig: jest.fn().mockResolvedValue({
      min_burn_amount: 5,
      max_burn_amount: 10000,
      base_unit: 4.99,
      ash_reward_percent: 1.0,
      reward_pool_split: 0.5,
      profit_pool_split: 0.5,
      referral_commission: 0.10,
      vip_holy_fire_bonus: 0.50,
      boost_cost_ash: 1000,
      boost_duration_ms: 3600000,
      weight_cap: 300,
      referral_weight_cap_pct: 0.40,
      prize_pool_target: 500,
      anti_snipe_seconds: 10,
    }),
    getEmissionMultiplier: jest.fn().mockResolvedValue(1),
  },
  ASH_TOKEN_PRICE_USD: 0.01,
}));

jest.mock("../../services/roundService", () => ({
  RoundService: {
    getActiveRound: jest.fn(),
    endRound: jest.fn(),
    getRoundLeaderboard: jest.fn().mockResolvedValue([]),
  },
}));

import { prisma } from "../../utils/prisma";
import { BurnService } from "../../services/burnService";
import { RoundService } from "../../services/roundService";
import { NotFoundError } from "../../utils/errors";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    username: "BurnerKing",
    isVip: false,
    isBanned: false,
    vipExpiresAt: null,
    vipTier: null,
    referredById: null,
    referralsMade: [],
    wallet: {
      usdcBalance: "1000",
      ashBalance: "0",
      cumulativeWeight: "0",
      boostExpiresAt: null,
    },
    ...overrides,
  };
}

function makeActiveRound(overrides: Record<string, unknown> = {}) {
  return {
    id: "round-active",
    roundNumber: 3,
    status: "ACTIVE",
    prizePoolTarget: 500,
    currentPool: 200,
    rank1HolderId: null,
    rank1SinceAt: null,
    endsAt: new Date(Date.now() + 86400000),
    ...overrides,
  };
}

function mockFullTransaction(options: {
  usdcBalance?: string;
  newRoundPool?: number;
  referredById?: string | null;
} = {}) {
  const { usdcBalance = "1000", newRoundPool = 205, referredById = null } = options;

  (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
    const tx = {
      wallet: {
        findUnique: jest.fn().mockResolvedValue({ usdcBalance }),
        update: jest.fn().mockResolvedValue({ usdcBalance: "995", cumulativeWeight: "1.002" }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
      profitPool: { updateMany: jest.fn().mockResolvedValue({}) },
      referralPool: { updateMany: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue({ balance: "1000" }) },
      round: {
        update: jest.fn().mockResolvedValue({ currentPool: String(newRoundPool) }),
      },
      burn: { create: jest.fn().mockResolvedValue({ id: "burn-1" }) },
      transaction: { create: jest.fn().mockResolvedValue({}) },
      referral: { updateMany: jest.fn().mockResolvedValue({}) },
    };
    return fn(tx);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrisma.platformConfig as any).upsert.mockResolvedValue({});
});

// ===========================================================================
// Active round — round pool update (covers lines 226-230)
// ===========================================================================
describe("BurnService.executeBurn — with active round", () => {
  test("updates round.currentPool when an active round exists", async () => {
    const activeRound = makeActiveRound();
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(activeRound);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    let roundUpdated = false;
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ usdcBalance: "1000" }),
          update: jest.fn().mockResolvedValue({ usdcBalance: "995", cumulativeWeight: "1.002" }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
        profitPool: { updateMany: jest.fn().mockResolvedValue({}) },
        referralPool: { updateMany: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue({ balance: "1000" }) },
        round: {
          update: jest.fn().mockImplementation(() => {
            roundUpdated = true;
            return { currentPool: "205" };
          }),
        },
        burn: { create: jest.fn().mockResolvedValue({ id: "burn-1" }) },
        transaction: { create: jest.fn().mockResolvedValue({}) },
        referral: { updateMany: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue(activeRound);
    (RoundService.getRoundLeaderboard as jest.Mock).mockResolvedValue([
      { rank: 1, userId: "user-1", username: "BurnerKing", cumulativeWeight: 1.002, distanceToFirst: 0 },
    ]);

    const result = await BurnService.executeBurn("user-1", 10);

    expect(roundUpdated).toBe(true);
    expect(result.roundId).toBe("round-active");
  });

  test("roundEnded=true when pool hits target and endRound succeeds (covers 300-308)", async () => {
    const activeRound = makeActiveRound({ prizePoolTarget: 200, currentPool: 195 });
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(activeRound);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ usdcBalance: "1000" }),
          update: jest.fn().mockResolvedValue({ usdcBalance: "990", cumulativeWeight: "2" }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
        profitPool: { updateMany: jest.fn().mockResolvedValue({}) },
        referralPool: { updateMany: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue({ balance: "1000" }) },
        round: {
          update: jest.fn().mockResolvedValue({ currentPool: "200" }), // hits target
        },
        burn: { create: jest.fn().mockResolvedValue({ id: "burn-trigger" }) },
        transaction: { create: jest.fn().mockResolvedValue({}) },
        referral: { updateMany: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    (RoundService.endRound as jest.Mock).mockResolvedValue({
      winner: { userId: "user-1", username: "BurnerKing" },
      prizeAmount: 140,
      roundNumber: 3,
    });

    (mockPrisma.burn.update as jest.Mock).mockResolvedValue({});

    const result = await BurnService.executeBurn("user-1", 10);

    expect(result.roundEnded).toBe(true);
    expect(result.roundWinner).toBe("BurnerKing");
    expect(result.roundPrize).toBe(140);
    expect(RoundService.endRound).toHaveBeenCalledWith("round-active");
  });

  test("roundEnded=false when endRound throws (race condition — round already ended)", async () => {
    const activeRound = makeActiveRound({ prizePoolTarget: 200, currentPool: 195 });
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(activeRound);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ usdcBalance: "1000" }),
          update: jest.fn().mockResolvedValue({ usdcBalance: "990", cumulativeWeight: "2" }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
        profitPool: { updateMany: jest.fn().mockResolvedValue({}) },
        referralPool: { updateMany: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue({ balance: "1000" }) },
        round: { update: jest.fn().mockResolvedValue({ currentPool: "200" }) },
        burn: { create: jest.fn().mockResolvedValue({ id: "burn-race" }) },
        transaction: { create: jest.fn().mockResolvedValue({}) },
        referral: { updateMany: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    (RoundService.endRound as jest.Mock).mockRejectedValue(new Error("Round is already completed"));

    const result = await BurnService.executeBurn("user-1", 10);

    expect(result.roundEnded).toBe(false); // silently ignored
    expect(result.roundId).toBe("round-active");
  });

  test("anti-snipe tracker updated when rank changes (covers 323-335)", async () => {
    const activeRound = makeActiveRound({ rank1HolderId: "user-other" });
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(activeRound);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    mockFullTransaction({ newRoundPool: 205 }); // doesn't hit target

    (RoundService.getRoundLeaderboard as jest.Mock).mockResolvedValue([
      { rank: 1, userId: "user-1", username: "BurnerKing", cumulativeWeight: 5, distanceToFirst: 0 },
    ]);

    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue({
      ...activeRound,
      rank1HolderId: "user-other", // different from new rank #1
    });
    (mockPrisma.round.update as jest.Mock).mockResolvedValue({});

    await BurnService.executeBurn("user-1", 10);

    // Anti-snipe tracker should have been updated with new rank1HolderId
    expect(mockPrisma.round.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ rank1HolderId: "user-1" }),
      })
    );
  });
});

// ===========================================================================
// Referral reward processing (covers lines 262-285)
// ===========================================================================
describe("BurnService.executeBurn — referral rewards (§21 edge cases)", () => {
  test("pays referral commission from referral pool when referredById is set", async () => {
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(makeActiveRound());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({ referredById: "referrer-1" })
    );

    let referrerCredited = false;
    let referralPoolDecremented = false;
    let referralTxCreated = false;

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ usdcBalance: "1000" }),
          update: jest.fn().mockResolvedValue({ usdcBalance: "990", cumulativeWeight: "1.002" }),
          updateMany: jest.fn().mockImplementation((args: any) => {
            if (args.where?.userId === "referrer-1") referrerCredited = true;
            return {};
          }),
        },
        rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
        profitPool: { updateMany: jest.fn().mockResolvedValue({}) },
        referralPool: {
          findFirst: jest.fn().mockResolvedValue({ balance: "1000" }),
          updateMany: jest.fn().mockImplementation((args: any) => {
            if (args.data?.balance?.decrement) referralPoolDecremented = true;
            return {};
          }),
        },
        round: { update: jest.fn().mockResolvedValue({ currentPool: "10" }) },
        burn: { create: jest.fn().mockResolvedValue({ id: "burn-ref" }) },
        transaction: {
          create: jest.fn().mockImplementation((args: any) => {
            // burnService records the referral payout with the canonical "REFERRAL"
            // type (the legacy "REFERRAL_REWARD" value is mapped to it on read).
            if (args.data?.type === "REFERRAL") referralTxCreated = true;
            return {};
          }),
        },
        referral: { updateMany: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    await BurnService.executeBurn("user-1", 10);

    expect(referrerCredited).toBe(true);
    expect(referralPoolDecremented).toBe(true);
    expect(referralTxCreated).toBe(true);
  });

  test("Referral Code Used At Registration But Referrer Deleted — no error, burn completes normally", async () => {
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(makeActiveRound());
    // User has referredById set but referrer's wallet doesn't exist
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({ referredById: "deleted-referrer" })
    );

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ usdcBalance: "1000" }),
          update: jest.fn().mockResolvedValue({ usdcBalance: "990", cumulativeWeight: "1.002" }),
          updateMany: jest.fn().mockResolvedValue({}),
        },
        rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
        profitPool: { updateMany: jest.fn().mockResolvedValue({}) },
        referralPool: {
          findFirst: jest.fn().mockResolvedValue({ balance: "1000" }),
          updateMany: jest.fn().mockResolvedValue({}),
        },
        round: { update: jest.fn().mockResolvedValue({ currentPool: "10" }) },
        burn: { create: jest.fn().mockResolvedValue({ id: "burn-no-ref" }) },
        transaction: { create: jest.fn().mockResolvedValue({}) },
        referral: { updateMany: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    // Burn should complete without error
    const result = await BurnService.executeBurn("user-1", 10);
    expect(result.roundId).toBe("round-active");
    expect(result.ashReward).toBe(1000);
  });

  test("VIP Expiry Mid-Burn — expired VIP gets no VIP bonus", async () => {
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(makeActiveRound());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({
        isVip: true,
        vipTier: "HOLY_FIRE",
        vipExpiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      })
    );

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ usdcBalance: "1000" }),
          update: jest.fn().mockResolvedValue({ usdcBalance: "990", cumulativeWeight: "1.002" }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
        profitPool: { updateMany: jest.fn().mockResolvedValue({}) },
        referralPool: { updateMany: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue({ balance: "1000" }) },
        round: { update: jest.fn().mockResolvedValue({ currentPool: "10" }) },
        burn: { create: jest.fn().mockResolvedValue({ id: "burn-vip-exp" }) },
        transaction: { create: jest.fn().mockResolvedValue({}) },
        referral: { updateMany: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const result = await BurnService.executeBurn("user-1", 10);
    // No VIP bonus: finalWeight should be ~10/4.99 = 2.004 (no +0.50)
    expect(result.finalWeight).toBeCloseTo(10 / 4.99, 3);
    // ASH: expired VIP gets no +20% ASH bonus (expiry checked for both weight and ASH)
    expect(result.ashReward).toBe(1000); // floor(10/0.01), no VIP multiplier
  });
});

// ===========================================================================
// getBurnHistory (covers lines 371-390)
// ===========================================================================
describe("BurnService.getBurnHistory", () => {
  test("returns paginated burns for a user", async () => {
    const burns = [
      { id: "b1", amountUsdc: 10, createdAt: new Date(), round: { roundNumber: 1, status: "COMPLETED" } },
    ];
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue(burns);
    (mockPrisma.burn.count as jest.Mock).mockResolvedValue(1);

    const result = await BurnService.getBurnHistory("user-1", 1, 20);

    expect(result.burns).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.pages).toBe(1);
  });

  test("pagination calculates pages correctly", async () => {
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.burn.count as jest.Mock).mockResolvedValue(45);

    const result = await BurnService.getBurnHistory("user-1", 1, 20);
    expect(result.pagination.pages).toBe(3); // ceil(45/20)
  });
});

// ===========================================================================
// getBurnStats (covers lines 397-415)
// ===========================================================================
describe("BurnService.getBurnStats", () => {
  test("returns correct stats", async () => {
    (mockPrisma.burn.count as jest.Mock)
      .mockResolvedValueOnce(10)  // totalBurns
      .mockResolvedValueOnce(2);  // totalWins
    (mockPrisma.burn.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amountUsdc: 500, ashReward: 50000 },
    });
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      cumulativeWeight: "45.5",
    });

    const stats = await BurnService.getBurnStats("user-1");

    expect(stats.totalBurns).toBe(10);
    expect(stats.totalWins).toBe(2);
    expect(stats.totalBurned).toBe(500);
    expect(stats.totalAshEarned).toBe(50000);
    expect(stats.cumulativeWeight).toBe(45.5);
  });

  test("returns zeros when user has no burns", async () => {
    (mockPrisma.burn.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.burn.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amountUsdc: null, ashReward: null },
    });
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);

    const stats = await BurnService.getBurnStats("user-1");
    expect(stats.totalBurned).toBe(0);
    expect(stats.cumulativeWeight).toBe(0);
  });
});

// ===========================================================================
// activateBoost — wallet not found
// ===========================================================================
describe("BurnService.activateBoost — wallet not found", () => {
  test("throws NotFoundError when wallet doesn't exist", async () => {
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(BurnService.activateBoost("user-404")).rejects.toThrow(NotFoundError);
  });
});

// ===========================================================================
// getBoostStatus — wallet not found (line 83)
// ===========================================================================
describe("BurnService.getBoostStatus", () => {
  test("throws NotFoundError when wallet not found", async () => {
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(BurnService.getBoostStatus("user-404")).rejects.toThrow(NotFoundError);
  });

  test("returns active=true when boost is still active", async () => {
    const boostExpiresAt = new Date(Date.now() + 3600_000); // 1h from now
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({ boostExpiresAt });
    const status = await BurnService.getBoostStatus("user-1");
    expect(status.active).toBe(true);
    expect(status.secondsLeft).toBeGreaterThan(0);
  });
});

// ===========================================================================
// executeBurn — max burn exceeded (line 117)
// ===========================================================================
describe("BurnService.executeBurn — max burn", () => {
  test("throws BadRequestError when amount exceeds max_burn_amount", async () => {
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(null);
    const { BadRequestError } = await import("../../utils/errors");
    await expect(BurnService.executeBurn("user-1", 99999)).rejects.toThrow(/Maximum participation/i);
  });
});

// ===========================================================================
// executeBurn — user not found (line 139)
// ===========================================================================
describe("BurnService.executeBurn — user not found", () => {
  test("throws NotFoundError when user.findUnique returns null", async () => {
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(BurnService.executeBurn("ghost-user", 10)).rejects.toThrow(/User or wallet not found/i);
  });
});

// ===========================================================================
// executeBurn — active VIP TRUE branch (line ~145) + boost active (lines ~155-162)
// ===========================================================================
describe("BurnService.executeBurn — VIP active + boost active branches", () => {
  test("applies VIP bonus when isVip=true and VIP not expired and tier=HOLY_FIRE", async () => {
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(makeActiveRound());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({
        isVip: true,
        vipTier: "HOLY_FIRE",
        vipExpiresAt: new Date(Date.now() + 86400_000), // expires tomorrow
      })
    );
    mockFullTransaction();

    const result = await BurnService.executeBurn("user-1", 10);
    // With VIP bonus 0.50: finalWeight = 10/4.99 + 0.50 ≈ 2.504
    expect(result.finalWeight).toBeCloseTo(10 / 4.99 + 0.50, 1);
  });

  test("applies boost bonus when boostExpiresAt is in the future", async () => {
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(makeActiveRound());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({
        wallet: {
          usdcBalance: "1000",
          ashBalance: "0",
          cumulativeWeight: "0",
          boostExpiresAt: new Date(Date.now() + 3600_000), // active boost
        },
      })
    );
    mockFullTransaction();

    const result = await BurnService.executeBurn("user-1", 10);
    // With boost bonus the finalWeight should be higher than base
    expect(result.finalWeight).toBeGreaterThan(10 / 4.99);
  });
});

// ===========================================================================
// executeBurn — insufficient balance inside tx (line 200)
// ===========================================================================
describe("BurnService.executeBurn — insufficient balance inside tx", () => {
  test("throws InsufficientBalanceError when wallet balance is too low in tx", async () => {
    const { InsufficientBalanceError } = await import("../../utils/errors");
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(makeActiveRound());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ usdcBalance: "5" }), // less than 10
          update: jest.fn(),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }), // guarded debit fails
        },
        rewardPool: { updateMany: jest.fn() },
        profitPool: { updateMany: jest.fn() },
        referralPool: { updateMany: jest.fn(), findFirst: jest.fn().mockResolvedValue({ balance: "1000" }) },
        round: { update: jest.fn().mockResolvedValue({ currentPool: "5" }) },
        burn: { create: jest.fn() },
        transaction: { create: jest.fn() },
        referral: { updateMany: jest.fn() },
      };
      return fn(tx);
    });
    await expect(BurnService.executeBurn("user-1", 10)).rejects.toThrow(/Insufficient balance/i);
  });
});

// ===========================================================================
// executeBurn — prize_pool_target null (line 319 ?? branch) + prizePoolTarget=0 (line 352)
// ===========================================================================
describe("BurnService.executeBurn — prizePoolTarget edge cases", () => {
  test("roundTargetPool comes from the active round's prizePoolTarget", async () => {
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(makeActiveRound({ prizePoolTarget: 500 }));
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
    mockFullTransaction();

    const result = await BurnService.executeBurn("user-1", 10);
    expect(result.roundTargetPool).toBe(500); // from activeRound.prizePoolTarget
  });
});

// ===========================================================================
// executeBurn — anti-snipe FALSE branch: rank unchanged (line 334)
// ===========================================================================
describe("BurnService.executeBurn — anti-snipe rank unchanged", () => {
  test("does NOT call round.update when rank1HolderId is already the new rank1 user", async () => {
    const activeRound = makeActiveRound({ rank1HolderId: "user-1" }); // already user-1
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(activeRound);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    mockFullTransaction({ newRoundPool: 205 });

    (RoundService.getRoundLeaderboard as jest.Mock).mockResolvedValue([
      { rank: 1, userId: "user-1", username: "BurnerKing", cumulativeWeight: 5, distanceToFirst: 0 },
    ]);

    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue({
      rank1HolderId: "user-1", // same as new rank1 → no update needed
    });

    await BurnService.executeBurn("user-1", 10);

    // round.update should NOT have been called for anti-snipe tracking
    const updateCalls = (mockPrisma.round.update as jest.Mock).mock.calls;
    const antiSnipeCalls = updateCalls.filter(
      (c: any) => c[0]?.data?.rank1HolderId !== undefined
    );
    expect(antiSnipeCalls).toHaveLength(0);
  });
});

// ===========================================================================
// executeBurn — ?? right-side fallbacks + weight cap exceeded (lines 117,139,160-169)
// ===========================================================================
describe("BurnService.executeBurn — null config fields trigger ?? fallbacks + weight cap", () => {
  test("covers ?? fallbacks for max_burn/base_unit/referralCap/weightCap and weight-cap exceeded path", async () => {
    const { OwnerService } = await import("../../services/ownerService") as any;
    OwnerService.getBurnConfig.mockResolvedValueOnce({
      min_burn_amount: 5,
      // max_burn_amount: null → ?? 10_000 right side
      // base_unit: null → ?? 4.99 right side
      // referral_weight_cap_pct: null → ?? 0.40 right side
      // weight_cap: null → ?? 300 right side
      ash_reward_percent: 1.0,
      reward_pool_split: 0.5,
      profit_pool_split: 0.5,
      referral_commission: 0.10,
      vip_holy_fire_bonus: 0.50,
      boost_cost_ash: 1000,
      boost_duration_ms: 3600000,
      anti_snipe_seconds: 10,
      prize_pool_target: 500,
    });

    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(makeActiveRound());
    // 1500 USDC / 4.99 ≈ 300.6 → exceeds weight_cap of 300
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({ wallet: { usdcBalance: "5000", ashBalance: "0", cumulativeWeight: "0", boostExpiresAt: null } })
    );
    mockFullTransaction({ usdcBalance: "5000", newRoundPool: 0 });

    const result = await BurnService.executeBurn("user-1", 1500);
    // finalWeight should be slightly above weightCap (300 + sqrt(extra))
    expect(result.finalWeight).toBeGreaterThan(300);
  });
});

// ===========================================================================
// executeBurn — currentWallet null in tx (line 200 ?? 0 right side)
// ===========================================================================
describe("BurnService.executeBurn — currentWallet null in tx", () => {
  test("throws InsufficientBalanceError with $0 when tx wallet findUnique returns null", async () => {
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(makeActiveRound());
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(null), // triggers ?? 0 at balance check
          update: jest.fn(),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }), // guarded debit fails (no wallet)
        },
        rewardPool: { updateMany: jest.fn() },
        profitPool: { updateMany: jest.fn() },
        referralPool: { updateMany: jest.fn(), findFirst: jest.fn().mockResolvedValue({ balance: "1000" }) },
        round: { update: jest.fn().mockResolvedValue({ currentPool: "10" }) },
        burn: { create: jest.fn() },
        transaction: { create: jest.fn() },
        referral: { updateMany: jest.fn() },
      };
      return fn(tx);
    });
    const err = await BurnService.executeBurn("user-1", 10).catch((e) => e);
    expect(err.message).toMatch(/Insufficient balance/i); // guarded debit fails when wallet missing
  });
});

// ===========================================================================
// executeBurn — user not in leaderboard (entry?.rank ?? null right side, line 325)
// ===========================================================================
describe("BurnService.executeBurn — user not in active-round leaderboard", () => {
  test("userRoundRank is null when user is not in leaderboard", async () => {
    const activeRound = makeActiveRound();
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(activeRound);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    mockFullTransaction({ newRoundPool: 205 }); // doesn't hit target

    // Leaderboard has no entry for user-1
    (RoundService.getRoundLeaderboard as jest.Mock).mockResolvedValue([
      { rank: 1, userId: "other-user", username: "Other", cumulativeWeight: 5, distanceToFirst: 0 },
    ]);
    (mockPrisma.round.findUnique as jest.Mock).mockResolvedValue({ rank1HolderId: "other-user" });

    const result = await BurnService.executeBurn("user-1", 10);
    expect(result.userRoundRank).toBeNull(); // entry?.rank ?? null right side
  });
});

// ===========================================================================
// executeBurn — prizePoolTarget = 0 (line 352 false branch)
// ===========================================================================
describe("BurnService.executeBurn — prizePoolTarget zero", () => {
  test("roundProgressPercent is 0 when active round prizePoolTarget is 0", async () => {
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(makeActiveRound({ prizePoolTarget: 0, currentPool: 0 }));
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
    mockFullTransaction({ newRoundPool: 0 });

    const result = await BurnService.executeBurn("user-1", 10);
    expect(result.roundProgressPercent).toBe(0);
  });
});

// ===========================================================================
// executeBurn — active round with EMPTY leaderboard (line 328 false branch)
// ===========================================================================
describe("BurnService.executeBurn — active round empty leaderboard", () => {
  test("skips anti-snipe tracker when leaderboard is empty", async () => {
    const activeRound = makeActiveRound({ prizePoolTarget: 500, currentPool: 100 });
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(activeRound);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
    mockFullTransaction({ newRoundPool: 105 }); // doesn't hit target

    // Empty leaderboard → leaderboard.length === 0 → false branch of if (leaderboard.length > 0)
    (RoundService.getRoundLeaderboard as jest.Mock).mockResolvedValue([]);

    await BurnService.executeBurn("user-1", 10);

    // round.update for anti-snipe should NOT have been called
    const updateCalls = (mockPrisma.round.update as jest.Mock).mock.calls;
    const antiSnipeCalls = updateCalls.filter(
      (c: any) => c[0]?.data?.rank1HolderId !== undefined
    );
    expect(antiSnipeCalls).toHaveLength(0);
  });
});

// ===========================================================================
// getBurnHistory — default params (covers lines 368-369 default param branches)
// ===========================================================================
describe("BurnService.getBurnHistory — default parameters", () => {
  test("uses default page=1 and limit=20 when called without those args", async () => {
    (mockPrisma.burn.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.burn.count as jest.Mock).mockResolvedValue(0);

    await BurnService.getBurnHistory("user-1"); // no page/limit → defaults used

    expect(mockPrisma.burn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 })
    );
  });
});
