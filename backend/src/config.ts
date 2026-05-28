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
    rpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
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

  // Game constants (defaults — also stored in PlatformConfig DB table)
  game: {
    minBurnAmount: 5.0,      // entry fee per round-based spec
    baseUnit: 4.99,          // weight reference unit — never changes
    constantFactor: 100,
    rewardPoolSplit: 0.5,    // 50% to reward/round pool
    profitPoolSplit: 0.5,    // 50% to profit pool
    referralCommission: 0.1, // 10%
    vipPrice: 24.99,
    boostCostAsh: 1000,
    boostDurationMs: 3600000, // 1 hour
    prizePoolTarget: 500,     // default round target
  },

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
};
