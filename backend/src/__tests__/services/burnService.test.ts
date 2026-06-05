/**
 * BurnService Integration Tests (§5.5, §6)
 *
 * Uses Jest mocks for Prisma and BlockchainService to test
 * business logic without a real database or blockchain.
 */

// Mock Prisma before any imports
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
  BlockchainService: {
    simulateVRF: jest.fn().mockReturnValue(BigInt(12345)),
  },
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
    getActiveRound: jest.fn().mockResolvedValue(null),
    endRound: jest.fn(),
    getRoundLeaderboard: jest.fn().mockResolvedValue([]),
  },
}));

import { prisma } from "../../utils/prisma";
import { BurnService } from "../../services/burnService";
import { InsufficientBalanceError, BadRequestError } from "../../utils/errors";
import { OwnerService } from "../../services/ownerService";
import { RoundService } from "../../services/roundService";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ---- Helpers ----

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

function mockTransaction(returnValue: unknown) {
  (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      wallet: {
        findUnique: jest.fn().mockResolvedValue({ usdcBalance: "1000" }),
        update: jest.fn().mockResolvedValue({ usdcBalance: "950", cumulativeWeight: "1.002" }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
      profitPool: { updateMany: jest.fn().mockResolvedValue({}) },
      referralPool: { updateMany: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue({ balance: "1000" }) },
      round: { update: jest.fn().mockResolvedValue({ currentPool: "205" }) },
      burn: { create: jest.fn().mockResolvedValue({ id: "burn-1" }) },
      transaction: { create: jest.fn().mockResolvedValue({}) },
      referral: { updateMany: jest.fn().mockResolvedValue({}) },
    };
    return fn(tx);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (RoundService.getActiveRound as jest.Mock).mockResolvedValue({
    id: "round-active",
    roundNumber: 1,
    prizePoolTarget: 500,
    currentPool: 0,
    rank1HolderId: null,
    rank1SinceAt: null,
    status: "ACTIVE",
    endsAt: null,
    timeLimitHours: null,
  });
  (mockPrisma.platformConfig as any).upsert.mockResolvedValue({});
});

describe("BurnService.executeBurn — validation", () => {
  test("rejects burn below minimum amount ($5)", async () => {
    await expect(BurnService.executeBurn("user-1", 4.99)).rejects.toThrow(BadRequestError);
  });

  test("rejects burn above maximum amount ($10000)", async () => {
    await expect(BurnService.executeBurn("user-1", 10001)).rejects.toThrow(BadRequestError);
  });

  test("rejects burn when user not found", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(BurnService.executeBurn("user-1", 10)).rejects.toThrow();
  });
});

describe("BurnService.executeBurn — balance check (atomic)", () => {
  test("rejects burn when balance insufficient (checked atomically in tx)", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    // Transaction reveals insufficient balance
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ usdcBalance: "4" }), // below $5 burn
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

    await expect(BurnService.executeBurn("user-1", 5)).rejects.toThrow(InsufficientBalanceError);
  });
});

describe("BurnService.executeBurn — pool split accounting", () => {
  test("reward and profit pools receive correct split (50/50)", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    let rewardIncrement = 0;
    let profitIncrement = 0;

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ usdcBalance: "1000" }),
          update: jest.fn().mockResolvedValue({ usdcBalance: "990", cumulativeWeight: "1.002" }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        rewardPool: {
          updateMany: jest.fn().mockImplementation(({ data }: any) => {
            rewardIncrement = data.totalBalance.increment;
            return {};
          }),
        },
        profitPool: {
          updateMany: jest.fn().mockImplementation(({ data }: any) => {
            profitIncrement = data.balance.increment;
            return {};
          }),
        },
        referralPool: { updateMany: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue({ balance: "1000" }) },
        round: { update: jest.fn().mockResolvedValue({ currentPool: "10" }) },
        burn: { create: jest.fn().mockResolvedValue({ id: "burn-1" }) },
        transaction: { create: jest.fn().mockResolvedValue({}) },
        referral: { updateMany: jest.fn() },
      };
      return fn(tx);
    });

    await BurnService.executeBurn("user-1", 10);

    expect(rewardIncrement).toBe(5); // 10 × 0.50
    expect(profitIncrement).toBe(5); // 10 × 0.50
    expect(rewardIncrement + profitIncrement).toBe(10); // conservation
  });
});

describe("BurnService.executeBurn — ASH reward", () => {
  test("ASH reward = floor(amountUsdc × 1.0 / 0.01)", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    let ashCredited = 0;

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ usdcBalance: "1000" }),
          updateMany: jest.fn().mockImplementation(({ data }: any) => {
            ashCredited = data.ashBalance.increment;
            return { count: 1 };
          }),
        },
        rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
        profitPool: { updateMany: jest.fn().mockResolvedValue({}) },
        referralPool: { updateMany: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue({ balance: "1000" }) },
        round: { update: jest.fn().mockResolvedValue({ currentPool: "10" }) },
        burn: { create: jest.fn().mockResolvedValue({ id: "burn-1" }) },
        transaction: { create: jest.fn().mockResolvedValue({}) },
        referral: { updateMany: jest.fn() },
      };
      return fn(tx);
    });

    const result = await BurnService.executeBurn("user-1", 10);

    expect(result.ashReward).toBe(1000); // floor(10 / 0.01)
    expect(ashCredited).toBe(1000);
  });

  test("Holy Fire VIP gets +20% ASH", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(
      makeUser({
        isVip: true,
        vipTier: "HOLY_FIRE",
        vipExpiresAt: new Date(Date.now() + 86400000),
      })
    );

    let ashCredited = 0;

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue({ usdcBalance: "1000" }),
          updateMany: jest.fn().mockImplementation(({ data }: any) => {
            ashCredited = data.ashBalance.increment;
            return { count: 1 };
          }),
        },
        rewardPool: { updateMany: jest.fn().mockResolvedValue({}) },
        profitPool: { updateMany: jest.fn().mockResolvedValue({}) },
        referralPool: { updateMany: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue({ balance: "1000" }) },
        round: { update: jest.fn().mockResolvedValue({ currentPool: "10" }) },
        burn: { create: jest.fn().mockResolvedValue({ id: "burn-1" }) },
        transaction: { create: jest.fn().mockResolvedValue({}) },
        referral: { updateMany: jest.fn() },
      };
      return fn(tx);
    });

    const result = await BurnService.executeBurn("user-1", 10);

    // base = 1000, +20% = 1200
    expect(result.ashReward).toBe(1200);
    expect(ashCredited).toBe(1200);
  });
});

describe("BurnService.executeBurn — no active round", () => {
  test("burn is blocked when no active round exists", async () => {
    (RoundService.getActiveRound as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    await expect(BurnService.executeBurn("user-1", 10)).rejects.toThrow(BadRequestError);
    await expect(BurnService.executeBurn("user-1", 10)).rejects.toThrow(/No active round/i);
  });
});

describe("BurnService.activateBoost", () => {
  test("rejects when ASH balance insufficient", async () => {
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      ashBalance: "500",
      boostExpiresAt: null,
    });

    await expect(BurnService.activateBoost("user-1")).rejects.toThrow(InsufficientBalanceError);
  });

  test("succeeds with enough ASH balance", async () => {
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      ashBalance: "1000",
      boostExpiresAt: null,
    });
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        wallet: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        transaction: { create: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const result = await BurnService.activateBoost("user-1");
    expect(result.ashDeducted).toBe(1000);
    expect(result.boostExpiresAt).toBeDefined();
  });

  test("stacking: extends from current expiry, not from now", async () => {
    const currentExpiry = new Date(Date.now() + 1800000); // 30 min from now
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      ashBalance: "1000",
      boostExpiresAt: currentExpiry,
    });

    let newExpiry: Date | null = null;
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        wallet: {
          updateMany: jest.fn().mockImplementation(({ data }: any) => {
            newExpiry = data.boostExpiresAt;
            return { count: 1 };
          }),
        },
        transaction: { create: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    await BurnService.activateBoost("user-1");

    // Should be currentExpiry + 1h (3600000ms), not now + 1h
    expect(newExpiry).not.toBeNull();
    const expectedExpiry = new Date(currentExpiry.getTime() + 3600000);
    expect(Math.abs(newExpiry!.getTime() - expectedExpiry.getTime())).toBeLessThan(100);
  });
});

describe("BurnService.getBoostStatus", () => {
  test("returns active=false when no boostExpiresAt", async () => {
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({ boostExpiresAt: null });
    const status = await BurnService.getBoostStatus("user-1");
    expect(status.active).toBe(false);
    expect(status.secondsLeft).toBe(0);
  });

  test("returns active=false when boost expired", async () => {
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      boostExpiresAt: new Date(Date.now() - 1000), // 1 second ago
    });
    const status = await BurnService.getBoostStatus("user-1");
    expect(status.active).toBe(false);
  });

  test("returns active=true and positive secondsLeft when boost active", async () => {
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({
      boostExpiresAt: new Date(Date.now() + 3600000), // 1h from now
    });
    const status = await BurnService.getBoostStatus("user-1");
    expect(status.active).toBe(true);
    expect(status.secondsLeft).toBeGreaterThan(3590);
  });
});
