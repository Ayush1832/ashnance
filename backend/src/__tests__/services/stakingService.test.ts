/**
 * StakingService Tests (§10)
 *
 * Covers: stake validation, lock enforcement, claim rewards, unstake,
 * and the §21 edge case "Staking Unstake Before Lock Expires".
 */

jest.mock("../../utils/prisma", () => ({
  prisma: {
    stakingPool: { findUnique: jest.fn(), findMany: jest.fn() },
    wallet: { findUnique: jest.fn(), update: jest.fn() },
    stakingPosition: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    transaction: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { prisma } from "../../utils/prisma";
import { StakingService } from "../../services/stakingService";
import { BadRequestError, NotFoundError, InsufficientBalanceError } from "../../utils/errors";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makePool(overrides: Record<string, unknown> = {}) {
  return {
    id: "pool-1",
    name: "EMBER POOL",
    apy: 8,
    lockDays: 7,
    minStake: 100,
    isActive: true,
    description: "7-day lock",
    ...overrides,
  };
}

function makePosition(overrides: Record<string, unknown> = {}) {
  const lockedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  return {
    id: "pos-1",
    userId: "user-1",
    poolId: "pool-1",
    amount: 500,
    status: "ACTIVE",
    lockedUntil,
    lastRewardAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    rewardsEarned: 0,
    rewardsClaimed: 0,
    pool: makePool(),
    ...overrides,
  };
}

function mockTx() {
  (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
    const tx = {
      wallet: { update: jest.fn().mockResolvedValue({ ashBalance: "1000" }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      stakingPosition: {
        create: jest.fn().mockResolvedValue({ ...makePosition(), id: "pos-new" }),
        update: jest.fn().mockResolvedValue(makePosition()),
      },
      transaction: { create: jest.fn().mockResolvedValue({ id: "tx-1" }) },
    };
    return fn(tx);
  });
}

beforeEach(() => jest.clearAllMocks());

// ===========================================================================
// stake
// ===========================================================================
describe("StakingService.stake", () => {
  test("rejects when pool not found", async () => {
    (mockPrisma.stakingPool.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(StakingService.stake("user-1", "bad-pool", 100)).rejects.toThrow(NotFoundError);
  });

  test("rejects when pool is inactive", async () => {
    (mockPrisma.stakingPool.findUnique as jest.Mock).mockResolvedValue(makePool({ isActive: false }));
    await expect(StakingService.stake("user-1", "pool-1", 100)).rejects.toThrow(NotFoundError);
  });

  test("rejects when amount below pool minimum", async () => {
    (mockPrisma.stakingPool.findUnique as jest.Mock).mockResolvedValue(makePool({ minStake: 100 }));
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({ ashBalance: "1000" });
    await expect(StakingService.stake("user-1", "pool-1", 50)).rejects.toThrow(BadRequestError);
  });

  test("rejects when wallet not found", async () => {
    (mockPrisma.stakingPool.findUnique as jest.Mock).mockResolvedValue(makePool());
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(StakingService.stake("user-1", "pool-1", 100)).rejects.toThrow(NotFoundError);
  });

  test("rejects when insufficient ASH balance", async () => {
    (mockPrisma.stakingPool.findUnique as jest.Mock).mockResolvedValue(makePool());
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({ ashBalance: "50" });
    await expect(StakingService.stake("user-1", "pool-1", 100)).rejects.toThrow(InsufficientBalanceError);
  });

  test("creates position and deducts ASH on valid stake", async () => {
    (mockPrisma.stakingPool.findUnique as jest.Mock).mockResolvedValue(makePool());
    (mockPrisma.wallet.findUnique as jest.Mock).mockResolvedValue({ ashBalance: "1000" });
    mockTx();

    const pos = await StakingService.stake("user-1", "pool-1", 500);
    expect((mockPrisma.$transaction as jest.Mock)).toHaveBeenCalled();
  });
});

// ===========================================================================
// unstake — Staking Unstake Before Lock Expires (§21)
// ===========================================================================
describe("StakingService.unstake", () => {
  test("Staking Unstake Before Lock Expires — rejects with days remaining and unlock date", async () => {
    const lockedUntil = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days left
    (mockPrisma.stakingPosition.findFirst as jest.Mock).mockResolvedValue(
      makePosition({ lockedUntil })
    );

    const err = await StakingService.unstake("user-1", "pos-1").catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestError);
    // Must include days remaining
    expect(err.message).toMatch(/5 more day/i);
    // Must include unlock date
    expect(err.message).toContain(lockedUntil.toLocaleDateString());
  });

  test("succeeds when lock has expired", async () => {
    const lockedUntil = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // expired yesterday
    (mockPrisma.stakingPosition.findFirst as jest.Mock).mockResolvedValue(
      makePosition({ lockedUntil })
    );
    mockTx();

    const result = await StakingService.unstake("user-1", "pos-1");
    expect(result.principal).toBe(500);
    expect(result.total).toBeGreaterThanOrEqual(500);
  });

  test("throws NotFoundError when position doesn't exist", async () => {
    (mockPrisma.stakingPosition.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(StakingService.unstake("user-1", "no-pos")).rejects.toThrow(NotFoundError);
  });
});

// ===========================================================================
// claimRewards
// ===========================================================================
describe("StakingService.claimRewards", () => {
  test("rejects when no rewards have accrued (< 0.01 ASH)", async () => {
    (mockPrisma.stakingPosition.findFirst as jest.Mock).mockResolvedValue(
      makePosition({ lastRewardAt: new Date() }) // just now — no time elapsed
    );

    await expect(StakingService.claimRewards("user-1", "pos-1")).rejects.toThrow(BadRequestError);
  });

  test("credits rewards after sufficient time has elapsed", async () => {
    // 30 days elapsed → meaningful APY reward
    const lastRewardAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    (mockPrisma.stakingPosition.findFirst as jest.Mock).mockResolvedValue(
      makePosition({ lastRewardAt })
    );
    mockTx();

    const result = await StakingService.claimRewards("user-1", "pos-1");
    expect(result.claimed).toBeGreaterThan(0.01);
  });

  test("throws NotFoundError for non-existent position", async () => {
    (mockPrisma.stakingPosition.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(StakingService.claimRewards("user-1", "bad-pos")).rejects.toThrow(NotFoundError);
  });
});

// ===========================================================================
// getPools / getPositions / getSummary
// ===========================================================================
describe("StakingService.getPools", () => {
  test("returns active pools ordered by lockDays", async () => {
    const pools = [makePool({ name: "EMBER" }), makePool({ name: "FLAME", lockDays: 30 })];
    (mockPrisma.stakingPool.findMany as jest.Mock).mockResolvedValue(pools);
    const result = await StakingService.getPools();
    expect(result).toHaveLength(2);
  });
});

describe("StakingService.getPositions", () => {
  test("returns positions with computed pendingRewards and isUnlocked", async () => {
    const position = makePosition({
      lastRewardAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    });
    (mockPrisma.stakingPosition.findMany as jest.Mock).mockResolvedValue([position]);

    const result = await StakingService.getPositions("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].pendingRewards).toBeGreaterThan(0); // 1 day of APY
    expect(result[0].isUnlocked).toBe(false); // still locked
  });

  test("isUnlocked=true for expired positions", async () => {
    const position = makePosition({
      lockedUntil: new Date(Date.now() - 1000), // expired
      lastRewardAt: new Date(Date.now() - 1000),
    });
    (mockPrisma.stakingPosition.findMany as jest.Mock).mockResolvedValue([position]);

    const result = await StakingService.getPositions("user-1");
    expect(result[0].isUnlocked).toBe(true);
  });
});

describe("StakingService.getSummary", () => {
  test("returns totalStaked and totalPendingRewards", async () => {
    const position = makePosition({
      lastRewardAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    (mockPrisma.stakingPosition.findMany as jest.Mock).mockResolvedValue([position]);
    (mockPrisma.stakingPosition.aggregate as jest.Mock).mockResolvedValue({
      _sum: { rewardsClaimed: "10" },
    });

    const summary = await StakingService.getSummary("user-1");
    expect(summary.totalStaked).toBe(500);
    expect(summary.totalPendingRewards).toBeGreaterThan(0);
    expect(summary.totalClaimedAllTime).toBe(10);
  });
});
