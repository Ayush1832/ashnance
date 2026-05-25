import type {
  User, Round, BurnEvent, Transaction, WhitelistAddress,
  StakingPool, StakingPosition, Referral, LeaderboardRow, BurnConfig,
} from "./types";

// ============ MOCK DATA ============
// All numbers are realistic. Used everywhere to make screens feel alive.

export const mockUser: User = {
  id: "u_8x2j",
  username: "pyromancer",
  email: "you@ashnance.com",
  role: "OWNER",
  vip: "HOLY_FIRE",
  vipExpiresAt: new Date(Date.now() + 18 * 86400000).toISOString(),
  banned: false,
  privacy: false,
  twoFaEnabled: true,
  recoveryCodesRemaining: 7,
  walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  referralCode: "A3K9PX72WXYZ",
  createdAt: new Date(Date.now() - 42 * 86400000).toISOString(),
  usdcBalance: 847.23,
  ashBalance: 14_320,
  ashBoostExpiresAt: new Date(Date.now() + 23 * 60 * 1000).toISOString(),
  depositAddress: "Ash9DepoSitADdrr5sXyZ9wWqL7vH3kN2pT8fGmRcUe1B",
};

const usernames = [
  "pyromancer","blazewolf","emberqueen","torchbearer","ashking","infernox",
  "molten","cinderfall","sparkforge","wildfire","scorch","kindle",
  "flintlock","brimstone","heatwave","magmaheart","solflare","phantomx",
  "anonburner","fireant",
];

function rand(seed: number) { return (Math.sin(seed) + 1) / 2; }

export const mockRound: Round = {
  id: "r_412",
  number: 412,
  status: "ACTIVE",
  prizePool: 327.84,
  prizePoolTarget: 500,
  startedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  endsAt: new Date(Date.now() + 7.4 * 3600000).toISOString(),
  burnsLast60s: 23,
  leaderboard: Array.from({ length: 12 }, (_, i) => ({
    rank: i + 1,
    userId: `u_${i}`,
    username: i === 4 ? "pyromancer" : usernames[i % usernames.length],
    weight: +(220 - i * 14 + rand(i) * 6).toFixed(2),
    isAnonymous: i === 8 || i === 11,
    isYou: i === 4,
  })),
};

export const mockBurnFeed: BurnEvent[] = Array.from({ length: 18 }, (_, i) => ({
  id: `b_${i}`,
  username: usernames[i % usernames.length],
  amount: [5, 10, 25, 50, 100][i % 5],
  weight: +((([5,10,25,50,100][i % 5]) / 4.99).toFixed(2)),
  ash: [5, 10, 25, 50, 100][i % 5] * 100,
  at: Date.now() - i * 4500,
}));

export const mockTransactions: Transaction[] = [
  { id: "t1", type: "BURN",     description: "Burn — Round #412", amount: -50, asset: "USDC", status: "COMPLETED", at: new Date(Date.now()-1*3600000).toISOString() },
  { id: "t2", type: "BURN",     description: "Burn — Round #412", amount: -25, asset: "USDC", status: "COMPLETED", at: new Date(Date.now()-2*3600000).toISOString() },
  { id: "t3", type: "REFERRAL", description: "Referral reward from emberqueen", amount: 5.00, asset: "USDC", status: "COMPLETED", at: new Date(Date.now()-3*3600000).toISOString() },
  { id: "t4", type: "DEPOSIT",  description: "USDC deposit", amount: 500, asset: "USDC", status: "COMPLETED", at: new Date(Date.now()-1*86400000).toISOString(), txHash: "5JxhP9...A2c" },
  { id: "t5", type: "WIN",      description: "🏆 Round #408 prize", amount: 500, asset: "USDC", status: "COMPLETED", at: new Date(Date.now()-2*86400000).toISOString(), txHash: "9KkLm4...B7d" },
  { id: "t6", type: "VIP",      description: "Holy Fire VIP — 30 days", amount: -24.99, asset: "USDC", status: "COMPLETED", at: new Date(Date.now()-12*86400000).toISOString() },
  { id: "t7", type: "BOOST",    description: "ASH boost activated", amount: -1000, asset: "ASH", status: "COMPLETED", at: new Date(Date.now()-25*60000).toISOString() },
  { id: "t8", type: "WITHDRAW", description: "Withdraw to wallet", amount: -200, asset: "USDC", status: "PROCESSING", at: new Date(Date.now()-15*60000).toISOString() },
  { id: "t9", type: "ASH_CLAIM",description: "ASH claim on-chain", amount: -2500, asset: "ASH", status: "COMPLETED", at: new Date(Date.now()-7*86400000).toISOString(), txHash: "3Hxq...Z8r" },
];

export const mockWhitelist: WhitelistAddress[] = [
  { id: "w1", label: "Phantom main", address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", status: "ACTIVE" },
  { id: "w2", label: "Cold storage", address: "9Qb5kKj3pLm2vC8nDx7tR4hF6gWyEzNbA1sUv2QrXpYz", status: "PENDING", activatesAt: new Date(Date.now()+13*3600000).toISOString() },
];

export const stakingPools: StakingPool[] = [
  { id: "EMBER",   name: "Ember Pool",   apy: 8,  lockDays: 7,  minAsh: 100 },
  { id: "FLAME",   name: "Flame Pool",   apy: 15, lockDays: 30, minAsh: 500 },
  { id: "INFERNO", name: "Inferno Pool", apy: 30, lockDays: 90, minAsh: 1000 },
];

export const mockStakingPositions: StakingPosition[] = [
  { id: "s1", poolId: "FLAME",   staked: 2500, pending: 18.42, unlocksAt: new Date(Date.now()+12*86400000).toISOString(), status: "ACTIVE" },
  { id: "s2", poolId: "INFERNO", staked: 5000, pending: 87.31, unlocksAt: new Date(Date.now()+62*86400000).toISOString(), status: "ACTIVE" },
  { id: "s3", poolId: "EMBER",   staked: 800,  pending: 2.14,  unlocksAt: new Date(Date.now()-2*86400000).toISOString(),  status: "ACTIVE" },
];

export const mockReferrals: Referral[] = [
  { id: "r1", username: "emberqueen",  joinedAt: new Date(Date.now()-30*86400000).toISOString(), burnCount: 42, earned: 48.20, active: true },
  { id: "r2", username: "torchbearer", joinedAt: new Date(Date.now()-22*86400000).toISOString(), burnCount: 28, earned: 31.50, active: true },
  { id: "r3", username: "Anonymous",   joinedAt: new Date(Date.now()-14*86400000).toISOString(), burnCount: 11, earned: 9.80,  active: true },
  { id: "r4", username: "sparkforge",  joinedAt: new Date(Date.now()-8*86400000).toISOString(),  burnCount: 4,  earned: 3.20,  active: false },
  { id: "r5", username: "kindle",      joinedAt: new Date(Date.now()-3*86400000).toISOString(),  burnCount: 1,  earned: 0.50,  active: false },
];

export const mockLeaderboards = {
  winners: usernames.slice(0, 20).map((u, i): LeaderboardRow => ({
    rank: i + 1,
    username: u,
    primary: +(48_000 - i * 2150 + rand(i) * 400).toFixed(2),
    secondary: 24 - i,
    anonymous: i === 7 || i === 11,
    isYou: u === "pyromancer",
  })),
  burners: usernames.slice(0, 20).map((u, i): LeaderboardRow => ({
    rank: i + 1,
    username: u,
    primary: +(82_000 - i * 3200).toFixed(2),
    secondary: 412 - i * 12,
    isYou: u === "pyromancer",
  })),
  referrers: usernames.slice(0, 20).map((u, i): LeaderboardRow => ({
    rank: i + 1,
    username: u,
    primary: +(6_400 - i * 280).toFixed(2),
    secondary: 84 - i * 3,
    isYou: u === "pyromancer",
  })),
  ash: usernames.slice(0, 20).map((u, i): LeaderboardRow => ({
    rank: i + 1,
    username: u,
    primary: 420_000 - i * 18_000,
    isYou: u === "pyromancer",
  })),
};

export const mockAdminUsers = Array.from({ length: 24 }, (_, i) => ({
  id: `u_${i}`,
  username: usernames[i % usernames.length] + (i > 19 ? i : ""),
  email: `user${i}@example.com`,
  role: (i === 0 || i === 1) ? "ADMIN" : "USER",
  vip: i % 4 === 0 ? "HOLY_FIRE" : null,
  banned: i === 19,
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
}));

export const mockBurnConfig: BurnConfig = {
  ash_reward_percent: 1.0,
  reward_pool_split: 0.40,
  profit_pool_split: 0.40,
  referral_pool_split: 0.20,
  referral_commission: 0.10,
  min_burn_amount: 5,
  max_burn_amount: 10000,
  base_unit: 4.99,
  boost_cost_ash: 1000,
  boost_duration_ms: 3_600_000,
  prize_pool_target: 500,
  weight_cap: 300,
  referral_weight_cap_pct: 0.40,
  prize_safety_pct: 0.70,
  round_time_limit_hours: 24,
  anti_snipe_seconds: 10,
  emission_halving_threshold: 100_000_000,
  auto_round_creation: 1,
};

export const mockOwnerSolvency = {
  onChainUsdc: 12_847.32,
  liabilities: {
    userBalances: 6_240.18,
    rewardPool: 3_127.84,
    profitPool: 2_980.10,
    referralPool: 412.55,
  },
  get total() { return Object.values(this.liabilities).reduce((a,b)=>a+b,0); },
  get ratio() { return this.onChainUsdc / this.total; },
  solvent: true,
};

export const mockProfitPool = {
  balance: 2_980.10,
  totalDeposited: 18_420.00,
  totalWithdrawn: 15_439.90,
};

export const mockPendingWithdrawal: null | {
  id: string; amount: number; initiatedBy: string; initiatedAt: string; status: "PENDING" | "PARTIAL";
} = null;

export const usernamesList = usernames;

// ============ HELPERS ============
export function calcWeight(amount: number, opts: { vip?: boolean; boost?: boolean; activeReferrals?: number } = {}) {
  const base = amount / mockBurnConfig.base_unit;
  const vipBonus = opts.vip ? 0.5 : 0;
  const boostBonus = opts.boost ? 0.5 : 0;
  const referralBonus = Math.min(
    (Math.floor((opts.activeReferrals ?? 0) / 5)) * 0.2,
    (base + vipBonus + boostBonus) * mockBurnConfig.referral_weight_cap_pct,
  );
  const raw = base + vipBonus + boostBonus + referralBonus;
  const cap = mockBurnConfig.weight_cap;
  const final = raw > cap ? cap + Math.sqrt(raw - cap) : raw;
  return { base, vipBonus, boostBonus, referralBonus, raw, final };
}

export function calcAsh(amount: number, vip: boolean) {
  const base = Math.floor(amount * mockBurnConfig.ash_reward_percent / 0.01);
  return vip ? Math.floor(base * 1.2) : base;
}
