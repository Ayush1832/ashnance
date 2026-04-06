import dotenv from "dotenv";
dotenv.config();

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
    privateKey: process.env.SOLANA_PRIVATE_KEY || "",
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

  // Redis
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  // Game constants (defaults — also stored in PlatformConfig DB table)
  game: {
    minBurnAmount: 1.0,
    baseUnit: 4.99,   // weight reference unit — never changes
    constantFactor: 100,
    rewardPoolSplit: 0.5,   // 50% to reward pool
    profitPoolSplit: 0.5,   // 50% to profit pool
    referralCommission: 0.1, // 10%
    ashRewardMin: 200,
    ashRewardMax: 500,
    vipPrice: 24.99,
    boostCostAsh: 1000,
    boostDurationMs: 3600000, // 1 hour
  },

  // Owner admin panel
  ownerEmails: (process.env.OWNER_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean),
  owner1Wallet: process.env.OWNER_1_WALLET || "",
  owner2Wallet: process.env.OWNER_2_WALLET || "",

  // Weight bonuses
  weight: {
    sparkBonus: 0.10,
    activeAshBonus: 0.25,
    holyFireBonus: 0.50,
    referralBonusPer5: 0.20,
    ashBoostBonus: 0.50,
  },
};
