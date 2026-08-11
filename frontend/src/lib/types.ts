// Shared domain types for Ashnance.

export type Role = "USER" | "ADMIN" | "OWNER";
export type VipTier = "SPARK" | "ACTIVE_ASH" | "HOLY_FIRE" | null;

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  vip: VipTier;
  vipExpiresAt?: string;
  banned: boolean;
  privacy: boolean;
  twoFaEnabled: boolean;
  recoveryCodesRemaining: number;
  walletAddress?: string;
  referralCode: string;
  createdAt: string;
  usdcBalance: number;
  ashBalance: number;
  ashBoostExpiresAt?: string;
  depositAddress: string;
}

export interface Round {
  id: string;
  number: number;
  status: "ACTIVE" | "ENDED" | "CANCELLED";
  prizePool: number;
  prizePoolTarget: number;
  startedAt: string;
  endsAt?: string;
  winner?: { username: string; prize: number };
  leaderboard: RoundEntry[];
  burnsLast60s: number;
}

export interface RoundEntry {
  rank: number;
  userId: string;
  username: string;
  weight: number;
  isAnonymous?: boolean;
  isYou?: boolean;
}

export interface BurnEvent {
  id: string;
  username: string;
  amount: number;
  weight: number;
  ash: number;
  at: number;
}

export interface Transaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAW" | "BURN" | "WIN" | "REFERRAL" | "VIP" | "BOOST" | "ASH_CLAIM" | "STAKE";
  description: string;
  amount: number;
  asset: "USDC" | "ASH";
  status: "COMPLETED" | "PROCESSING" | "FAILED" | "PENDING";
  at: string;
  txHash?: string;
}

export interface WhitelistAddress {
  id: string;
  label?: string;
  address: string;
  status: "ACTIVE" | "PENDING";
  activatesAt?: string;
}

export interface StakingPool {
  id: string;                              // DB UUID — use for position matching
  kind: "EMBER" | "FLAME" | "INFERNO" | string; // pool category — use for color/icon lookup
  name: string;
  apy: number;
  lockDays: number;
  minAsh: number;
  description?: string;
}

export interface StakingPosition {
  id: string;
  poolId: string;
  staked: number;
  pending: number;
  unlocksAt: string;
  status: "ACTIVE" | "UNLOCKED" | "WITHDRAWN";
}

export interface Referral {
  id: string;
  username: string;
  joinedAt: string;
  burnCount: number;
  earned: number;
  active: boolean;
}

export interface LeaderboardRow {
  rank: number;
  username: string;
  primary: number;
  secondary?: number;
  anonymous?: boolean;
  isYou?: boolean;
}

// ---- Creator Prize Pools (separate module) ----

export interface Creator {
  id: string;
  slug: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  verified: boolean;
  referralCode: string;
  wallet?: { usdcBalance: number; totalEarned: number } | null;
}

export type CreatorPoolStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED" | "ARCHIVED" | "FROZEN";

export interface CreatorPool {
  id: string;
  creatorId: string;
  slug: string;
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  status: CreatorPoolStatus;
  prizeCurrency: string;
  minContribution: number;
  maxContribution?: number | null;
  creatorRevenuePercent: number;
  platformFeePercent: number;
  rolloverUnusedFunds: boolean;
  numberOfWinners: number;
  currentPoolValue: number;
  startDate: string;
  endDate?: string | null;
  createdAt: string;
}

export interface CreatorPoolParticipant {
  id: string;
  userId: string;
  weight: number;
  totalContributed: number;
  contributionCount: number;
  user: { username: string; avatarUrl?: string | null };
}

export interface CreatorPoolWinner {
  id: string;
  userId: string;
  prizeAmount: number;
  selectedAt: string;
  user: { username: string };
}

export type BattleActionType = "ATTACK" | "SHIELD" | "COUNTER" | "BOOST" | "RECOVERY";

export interface BattleEvent {
  id: string;
  actionType: BattleActionType;
  ashSpent: number;
  weightDelta: number;
  createdAt: string;
  actor: { username: string };
  target?: { username: string } | null;
}

export interface CreatorWithdrawalRequest {
  id: string;
  amount: number;
  address?: string | null;
  status: "PENDING" | "APPROVED" | "PROCESSING" | "REJECTED" | "COMPLETED" | "FAILED";
  txHash?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  creator?: { displayName: string; slug: string };
}

export interface CreatorReferralStats {
  totalFollowers: number;
  viaReferral: number;
  viaDirect: number;
  recentFollowers: { username: string; joinedVia: string; joinedAt: string }[];
}

export interface CreatorPoolAnalytics {
  totalContributions: number;
  totalRaised: number;
  revenueEarned: number;
  currentPoolValue: number;
  activeParticipants: number;
  newParticipants: number;
  returningParticipants: number;
  dailyGrowth: { day: string; count: number; amount: number }[];
  topContributors: { username: string; totalContributed: number; contributionCount: number }[];
  geoDistribution: { country: string; count: number }[];
}

export interface BurnConfig {
  ash_reward_percent: number;
  reward_pool_split: number;
  profit_pool_split: number;
  referral_pool_split: number;
  referral_commission: number;
  min_burn_amount: number;
  max_burn_amount: number;
  base_unit: number;
  boost_cost_ash: number;
  boost_duration_ms: number;
  prize_pool_target: number;
  weight_cap: number;
  referral_weight_cap_pct: number;
  prize_safety_pct: number;
  round_time_limit_hours: number;
  anti_snipe_seconds: number;
  emission_halving_threshold: number;
  auto_round_creation: number;
}
