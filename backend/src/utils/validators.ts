import { z } from "zod";

// ---- AUTH ----
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(256, "Password must be at most 256 characters")
    .optional(), // optional for wallet/OAuth users
  referralCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required").optional(),
});

export const otpVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

// ---- BURN ----
export const burnSchema = z.object({
  amount: z
    .number()
    .min(5.0, "Minimum burn amount is $5.00 USDC")
    .max(10000, "Maximum burn amount is $10,000 USDC"),
});

// ---- WALLET ----
export const depositSchema = z.object({
  amount: z.number().positive("Amount must be positive").min(1, "Minimum deposit is 1 USDC"),
  txHash: z.string().min(1, "Transaction hash is required"),
});

export const withdrawSchema = z.object({
  amount: z
    .number()
    .finite("Amount must be a finite number")
    .positive("Amount must be positive")
    .min(10, "Minimum withdrawal is $10 USDC"),
  address: z.string().min(32, "Invalid Solana address"),
  twoFaCode: z.string().length(6, "2FA code must be 6 digits"),
});

// ---- PROFILE ----
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  avatarUrl: z.string().url().optional(),
  country: z.string().max(2).optional(),
  privacyMode: z.boolean().optional(),
});

// ---- 2FA ----
export const enable2FASchema = z.object({
  token: z.string().length(6, "Token must be 6 digits"),
});

// ---- ADMIN ----
export const updatePrizeConfigSchema = z.object({
  tier: z.enum(["JACKPOT", "BIG", "MEDIUM", "SMALL"]),
  value: z.number().min(0),
  poolPercent: z.number().min(0).max(1),
  probability: z.number().min(0).max(1),
  isActive: z.boolean(),
});

export const updatePlatformConfigSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

// ---- WAITLIST (Coming Soon) ----
export const subscribeSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(254),
});

// ---- CREATOR PRIZE POOLS ----
export const createCreatorProfileSchema = z.object({
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(32, "Slug must be at most 32 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  displayName: z.string().min(2).max(60),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
});

export const updateCreatorProfileSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
});

export const createCreatorPoolSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(48)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  name: z.string().min(2).max(80),
  description: z.string().max(2000).optional(),
  coverImageUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  minContribution: z.number().positive().min(0.5, "Minimum contribution must be at least $0.50"),
  maxContribution: z.number().positive().optional(),
  creatorRevenuePercent: z.number().min(0).max(0.5, "Creator revenue cannot exceed 50%"),
  rolloverUnusedFunds: z.boolean().optional(),
  numberOfWinners: z.number().int().min(1).max(10).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updateCreatorPoolSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(2000).optional(),
  coverImageUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  minContribution: z.number().positive().optional(),
  maxContribution: z.number().positive().optional(),
  creatorRevenuePercent: z.number().min(0).max(0.5).optional(),
  rolloverUnusedFunds: z.boolean().optional(),
  endDate: z.string().datetime().optional(),
});

export const contributeToPoolSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
});

export const battleActionSchema = z.object({
  actionType: z.enum(["ATTACK", "SHIELD", "COUNTER", "BOOST", "RECOVERY"]),
  targetUserId: z.string().uuid().optional(),
  ashAmount: z.number().positive().optional(),
});

export const requestCreatorWithdrawalSchema = z.object({
  amount: z.number().positive().min(5, "Minimum withdrawal is $5 USDC"),
  address: z.string().min(32, "Invalid Solana address"),
});

export const followCreatorSchema = z.object({
  referralCode: z.string().optional(),
});
