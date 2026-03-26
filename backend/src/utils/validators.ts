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
    .min(4.99, "Minimum burn amount is $4.99 USDC")
    .max(10000, "Maximum burn amount is $10,000 USDC"),
  useBoost: z.boolean().optional().default(false),
});

// ---- WALLET ----
export const depositSchema = z.object({
  amount: z.number().min(1, "Minimum deposit is 1 USDC"),
  txHash: z.string().min(1, "Transaction hash is required"),
});

export const withdrawSchema = z.object({
  amount: z
    .number()
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
