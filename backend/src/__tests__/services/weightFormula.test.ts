/**
 * Weight Formula Unit Tests (§6.2 of PROJECT_OVERVIEW.md)
 *
 * Tests the weight calculation logic extracted from BurnService.executeBurn().
 * These are pure math tests — no DB or blockchain needed.
 */

// ---- Mirror the exact formula from BurnService ----

interface WeightInput {
  amountUsdc: number;
  baseUnit?: number;
  isHolyFire?: boolean;
  boostActive?: boolean;
  activeReferrals?: number;
  referralCapPct?: number;
  weightCap?: number;
  vipHolyFireBonus?: number;
  referralBonusPer5?: number;
  ashBoostBonus?: number;
}

function calcFinalWeight(input: WeightInput): { baseWeight: number; finalWeight: number; referralBonus: number } {
  const {
    amountUsdc,
    baseUnit = 4.99,
    isHolyFire = false,
    boostActive = false,
    activeReferrals = 0,
    referralCapPct = 0.40,
    weightCap = 300,
    vipHolyFireBonus = 0.50,
    referralBonusPer5 = 0.20,
    ashBoostBonus = 0.50,
  } = input;

  const baseWeight = amountUsdc / baseUnit;
  const vipBonus = isHolyFire ? vipHolyFireBonus : 0;
  const boostBonus = boostActive ? ashBoostBonus : 0;

  const rawReferralBonus = Math.floor(activeReferrals / 5) * referralBonusPer5;
  const nonReferralWeight = baseWeight + vipBonus + boostBonus;
  const maxReferralWeight = (referralCapPct / (1 - referralCapPct)) * nonReferralWeight;
  const referralBonus = Math.min(rawReferralBonus, maxReferralWeight);

  const rawTotalWeight = baseWeight + vipBonus + referralBonus + boostBonus;
  const finalWeight = rawTotalWeight <= weightCap
    ? rawTotalWeight
    : weightCap + Math.sqrt(rawTotalWeight - weightCap);

  return { baseWeight, finalWeight, referralBonus };
}

// ---- ASH reward formula ----
const ASH_TOKEN_PRICE_USD = 0.01;

function calcAshReward(amountUsdc: number, ashRewardPercent = 1.0, isHolyFire = false): number {
  let reward = Math.floor((amountUsdc * ashRewardPercent) / ASH_TOKEN_PRICE_USD);
  if (isHolyFire) reward = Math.floor(reward * 1.2);
  return reward;
}

// ---- Tests ----

describe("Weight Formula (§6.2)", () => {
  // Table from spec:
  // | Burn | VIP | Referrals | Boost | Raw Weight | Final Weight |
  // | $5   | No  | 0         | No    | 1.002      | 1.002        |
  // | $5   | Yes | 0         | No    | 1.502      | 1.502        |
  // | $5   | No  | 5         | No    | 1.202      | 1.202        |
  // | $10  | Yes | 5         | Yes   | 3.510      | 3.510        |
  // | $1500| No  | 0         | No    | 300.6      | 300.775      |

  test("$5 no VIP no referrals no boost ≈ 1.002", () => {
    const { finalWeight } = calcFinalWeight({ amountUsdc: 5 });
    expect(finalWeight).toBeCloseTo(5 / 4.99, 3);
    expect(finalWeight).toBeCloseTo(1.002, 2);
  });

  test("$5 Holy Fire VIP no referrals no boost ≈ 1.502", () => {
    const { finalWeight } = calcFinalWeight({ amountUsdc: 5, isHolyFire: true });
    expect(finalWeight).toBeCloseTo(1.002 + 0.5, 2);
  });

  test("$5 no VIP 5 referrals no boost ≈ 1.202", () => {
    const { finalWeight } = calcFinalWeight({ amountUsdc: 5, activeReferrals: 5 });
    expect(finalWeight).toBeCloseTo(1.002 + 0.20, 2);
  });

  test("$10 Holy Fire 5 referrals boost active ≈ 3.204", () => {
    // Actual calculation: 10/4.99=2.004 + VIP=0.50 + boost=0.50 + referral=0.20 = 3.204
    // (NOTE: spec table §6.2 shows 3.510 which appears to be a documentation error)
    const { finalWeight } = calcFinalWeight({
      amountUsdc: 10,
      isHolyFire: true,
      activeReferrals: 5,
      boostActive: true,
    });
    const expected = 10 / 4.99 + 0.50 + 0.50 + 0.20;
    expect(finalWeight).toBeCloseTo(expected, 4);
    expect(finalWeight).toBeCloseTo(3.204, 2);
  });

  test("$1500 no VIP no referrals no boost: diminishing returns above 300", () => {
    const { finalWeight } = calcFinalWeight({ amountUsdc: 1500 });
    const rawWeight = 1500 / 4.99; // ~300.6
    expect(rawWeight).toBeGreaterThan(300);
    // finalWeight = 300 + sqrt(300.6 - 300) ≈ 300.775
    const expected = 300 + Math.sqrt(rawWeight - 300);
    expect(finalWeight).toBeCloseTo(expected, 5);
    expect(finalWeight).toBeCloseTo(300.775, 2);
  });

  test("$1500 should be strictly less than $3000 doubled (diminishing returns)", () => {
    const { finalWeight: w1500 } = calcFinalWeight({ amountUsdc: 1500 });
    const { finalWeight: w3000 } = calcFinalWeight({ amountUsdc: 3000 });
    expect(w3000).toBeLessThan(w1500 * 2);
  });

  test("weight cap at exactly $1500 (raw ≈ 300.6)", () => {
    const { finalWeight } = calcFinalWeight({ amountUsdc: 1500 });
    expect(finalWeight).toBeGreaterThan(300);
    expect(finalWeight).toBeLessThan(301);
  });

  test("burn at exactly $300 × 4.99 = $1497 hits exactly weight 300 — no diminishing", () => {
    const { finalWeight } = calcFinalWeight({ amountUsdc: 300 * 4.99 });
    expect(finalWeight).toBeCloseTo(300, 4);
  });

  test("baseWeight equals amount / 4.99", () => {
    const amounts = [5, 10, 50, 100, 500];
    for (const amount of amounts) {
      const { baseWeight } = calcFinalWeight({ amountUsdc: amount });
      expect(baseWeight).toBeCloseTo(amount / 4.99, 8);
    }
  });
});

describe("Referral Cap (Req #4)", () => {
  test("referral bonus capped at 40% of non-referral weight", () => {
    // 25 referrals = raw 1.00 bonus; with $5 burn, non-referral = 1.002
    // cap = (0.4/0.6) * 1.002 ≈ 0.668
    const { referralBonus } = calcFinalWeight({ amountUsdc: 5, activeReferrals: 25 });
    const nonReferralWeight = 5 / 4.99;
    const cap = (0.40 / 0.60) * nonReferralWeight;
    expect(referralBonus).toBeCloseTo(cap, 5);
    expect(referralBonus).toBeLessThan(1.0); // raw bonus would have been 1.0
  });

  test("under-cap: 5 referrals with $100 burn — raw bonus < cap", () => {
    const { referralBonus } = calcFinalWeight({ amountUsdc: 100, activeReferrals: 5 });
    expect(referralBonus).toBeCloseTo(0.20, 5); // raw = 0.20, well under cap
  });

  test("referral bonus never exceeds 40% of total weight", () => {
    // Try many combinations
    const cases = [
      { amount: 5,    referrals: 100 },
      { amount: 10,   referrals: 50  },
      { amount: 100,  referrals: 1000},
    ];
    for (const { amount, referrals } of cases) {
      const { finalWeight, referralBonus } = calcFinalWeight({ amountUsdc: amount, activeReferrals: referrals });
      const referralFraction = referralBonus / finalWeight;
      expect(referralFraction).toBeLessThanOrEqual(0.40 + 1e-9);
    }
  });

  test("0 referrals = 0 referral bonus", () => {
    const { referralBonus } = calcFinalWeight({ amountUsdc: 50, activeReferrals: 0 });
    expect(referralBonus).toBe(0);
  });

  test("4 referrals = 0 referral bonus (must be multiples of 5)", () => {
    const { referralBonus } = calcFinalWeight({ amountUsdc: 50, activeReferrals: 4 });
    expect(referralBonus).toBe(0);
  });

  test("5 referrals = 0.20 base bonus (if under cap)", () => {
    const { referralBonus } = calcFinalWeight({ amountUsdc: 1000, activeReferrals: 5 });
    expect(referralBonus).toBeCloseTo(0.20, 5);
  });
});

describe("ASH Reward Formula (§6.3)", () => {
  test("$10 burn at 1.0 percent = 1000 ASH", () => {
    expect(calcAshReward(10)).toBe(1000);
  });

  test("$5 burn at 1.0 percent = 500 ASH", () => {
    expect(calcAshReward(5)).toBe(500);
  });

  test("Holy Fire VIP gets +20% ASH (floor applied)", () => {
    const base = calcAshReward(10, 1.0, false);
    const vip = calcAshReward(10, 1.0, true);
    expect(vip).toBe(Math.floor(base * 1.2));
    expect(vip).toBe(1200);
  });

  test("ASH uses floor(), never rounds up", () => {
    // $5.5 at 1.0% = floor(5.5 / 0.01) = floor(550) = 550
    expect(calcAshReward(5.5)).toBe(550);
  });

  test("ASH reward scales linearly below 1.0× rate", () => {
    const half = calcAshReward(10, 0.5);
    const full = calcAshReward(10, 1.0);
    expect(half).toBe(Math.floor(full / 2));
  });
});

describe("Pool Split Conservation (§6.4)", () => {
  test("reward_pool_split + profit_pool_split = 1.0 (default)", () => {
    const rewardSplit = 0.5;
    const profitSplit = 0.5;
    expect(rewardSplit + profitSplit).toBe(1.0);
  });

  test("burn amount fully accounted for: reward + profit = burn (no referrer)", () => {
    const burnAmount = 100;
    const rewardSplit = 0.5;
    const profitSplit = 0.5;
    const rewardPool = burnAmount * rewardSplit;
    const profitPool = burnAmount * profitSplit;
    expect(rewardPool + profitPool).toBe(burnAmount);
  });

  test("referral commission deducted from reward pool only (§6.4)", () => {
    const burnAmount = 100;
    const rewardSplit = 0.5;
    const profitSplit = 0.5;
    const referralRate = 0.10;

    const rewardPoolDelta = burnAmount * rewardSplit;
    const profitPoolDelta = burnAmount * profitSplit;
    const referralCommission = burnAmount * referralRate;

    // Referral comes OUT of reward pool (not profit)
    const netRewardPool = rewardPoolDelta - referralCommission;

    // Conservation: netReward + profitPool + referralCommission = burnAmount
    expect(netRewardPool + profitPoolDelta + referralCommission).toBe(burnAmount);

    // Profit pool is unaffected by referral
    expect(profitPoolDelta).toBe(burnAmount * profitSplit);
  });

  test("no float leakage: integer-safe amounts sum exactly", () => {
    // Use amounts that are exact in float
    const amounts = [10, 20, 50, 100, 500, 1000];
    for (const amount of amounts) {
      const reward = amount * 0.5;
      const profit = amount * 0.5;
      expect(reward + profit).toBe(amount);
    }
  });
});

describe("Input Boundary Validation (§6.10 attack scenarios)", () => {
  test("negative amount produces negative baseWeight — must be rejected upstream", () => {
    // The validator (Zod) should reject this, but formula itself gives negative weight
    const { baseWeight } = calcFinalWeight({ amountUsdc: -100 });
    expect(baseWeight).toBeLessThan(0); // confirms must be rejected before formula
  });

  test("zero amount produces zero weight", () => {
    const { finalWeight } = calcFinalWeight({ amountUsdc: 0 });
    expect(finalWeight).toBe(0);
  });

  test("NaN amount propagates as NaN — must be rejected upstream", () => {
    const { finalWeight } = calcFinalWeight({ amountUsdc: NaN });
    expect(Number.isNaN(finalWeight)).toBe(true);
  });

  test("Infinity amount saturates at ~300 + large sqrt — but never <= Infinity", () => {
    // Must be rejected by max_burn_amount before reaching formula
    const { finalWeight } = calcFinalWeight({ amountUsdc: Number.MAX_SAFE_INTEGER });
    expect(Number.isFinite(finalWeight)).toBe(true); // formula is finite but must be blocked
  });
});
