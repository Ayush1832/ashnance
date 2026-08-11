import dotenv from "dotenv";
dotenv.config();

// Fail fast in production if critical secrets are missing
if (process.env.NODE_ENV === "production") {
  const required = [
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "DATABASE_URL",
    "FRONTEND_URL",
    "BACKEND_URL",
    "MASTER_KEYPAIR_SECRET",
    "SOLANA_RPC_URL",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[Config] Missing required environment variables in production: ${missing.join(", ")}`
    );
  }
  if (process.env.JWT_SECRET === "dev-jwt-secret" || process.env.JWT_REFRESH_SECRET === "dev-refresh-secret") {
    throw new Error("[Config] Dev JWT secrets must not be used in production.");
  }
  if ((process.env.JWT_SECRET ?? "").length < 32 || (process.env.JWT_REFRESH_SECRET ?? "").length < 32) {
    throw new Error("[Config] JWT secrets must be at least 32 characters in production.");
  }
  // A devnet RPC URL in production means every deposit balance check silently
  // queries the wrong chain — deposits would never be detected, with no error
  // anywhere. Refuse to start rather than run mainnet money against devnet state.
  if (/devnet/i.test(process.env.SOLANA_RPC_URL ?? "")) {
    throw new Error(
      "[Config] SOLANA_RPC_URL points at devnet in production. This must be a mainnet RPC endpoint."
    );
  }
  // If USDC_MINT is overridden to anything other than the real mainnet USDC mint,
  // every deposit balance check silently queries a different token — deposits sent
  // as real USDC would never be detected, with no error anywhere. Whoever sets this
  // env var must do so deliberately, not by an unnoticed leftover/copy-paste value.
  const REAL_USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  if (process.env.USDC_MINT && process.env.USDC_MINT !== REAL_USDC_MINT_MAINNET) {
    throw new Error(
      `[Config] USDC_MINT is set to "${process.env.USDC_MINT}", which is not the real mainnet USDC mint ` +
      `(${REAL_USDC_MINT_MAINNET}). Unset USDC_MINT to use the correct default, or fix the value.`
    );
  }
  // Warn (don't crash) on missing-but-non-fatal config
  const warnings: string[] = [];
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) warnings.push("SMTP_USER/SMTP_PASS (no emails will be sent — OTP login, alerts, withdrawal notifications)");
  if (!process.env.OWNER_EMAILS) warnings.push("OWNER_EMAILS (no one can access owner panel or receive critical alerts)");
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) warnings.push("GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (Google sign-in disabled)");
  if (warnings.length > 0) {
    console.warn(`[Config] Production warnings:\n  - ${warnings.join("\n  - ")}`);
  }
}

export const config = {
  // Server
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV !== "production",

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || "dev-jwt-secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  // Database
  databaseUrl: process.env.DATABASE_URL || "",

  // Solana
  solana: {
    ashMintAddress: process.env.ASH_MINT_ADDRESS || "",
  },

  // Email
  email: {
    host: process.env.SMTP_HOST || "smtp.sendgrid.net",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.EMAIL_FROM || "noreply@ashnance.com",
  },

  // OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },

  // Frontend / Backend URLs
  // frontendUrl = single URL used for redirects (OAuth callbacks etc.)
  frontendUrl: (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim(),
  // corsOrigins = all allowed origins for CORS (comma-separated)
  corsOrigins: (process.env.FRONTEND_URL || "http://localhost:3000").split(",").map(o => o.trim()).filter(Boolean),
  backendUrl:  process.env.BACKEND_URL  || "http://localhost:4000",

  // Owner admin panel
  ownerEmails: (process.env.OWNER_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean),
  owner1Wallet: process.env.OWNER_1_WALLET || "",
  owner2Wallet: process.env.OWNER_2_WALLET || "",

  // Weight bonuses
  weight: {
    holyFireBonus: 0.50,
    referralBonusPer5: 0.20,
    ashBoostBonus: 0.50,
  },

  // Creator Prize Pools (separate module — platform fee default, admin-tunable later)
  creatorPools: {
    defaultPlatformFeePercent: 0.05,
    maxCreatorRevenuePercent: 0.50,
    maxPlatformFeePercent: 0.20,
    // Flat one-time USDC fee charged to the creator's own Wallet.usdcBalance
    // when they open a new pool (createPool or duplicatePool) — routes into
    // ProfitPool alongside the per-contribution platform fee.
    poolCreationFeeUsdc: Number(process.env.CREATOR_POOL_CREATION_FEE_USDC) || 25,
  },
};
