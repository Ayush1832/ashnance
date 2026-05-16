import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { initWebSocket } from "./websocket/socketHandler";

// Routes
import authRoutes from "./routes/authRoutes";
import burnRoutes from "./routes/burnRoutes";
import walletRoutes from "./routes/walletRoutes";
import miscRoutes from "./routes/miscRoutes";
import vipRoutes from "./routes/vipRoutes";
import adminRoutes from "./routes/adminRoutes";
import stakingRoutes from "./routes/stakingRoutes";
import ownerRoutes from "./routes/ownerRoutes";
import roundRoutes from "./routes/roundRoutes";

// ============================================================
// Express App
// ============================================================
const app = express();
const httpServer = createServer(app);

// Trust Nginx reverse proxy so express-rate-limit reads the correct client IP
app.set("trust proxy", 1);

// ---- Security Headers ----
app.use(helmet());

// ---- Global Middleware ----
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !config.corsOrigins.includes(origin)) {
    res.status(403).json({ success: false, error: "CORS: origin not allowed" });
    return;
  }
  next();
});
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.corsOrigins.includes(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { success: false, error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: "Too many auth attempts" },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// OTP endpoint — strict limit: 5 requests per 10 minutes per IP
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, error: "Too many OTP requests, please wait before trying again" },
});
app.use("/api/auth/send-otp", otpLimiter);

// ---- Health Check ----
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    service: "Ashnance API",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ---- API Routes ----
app.use("/api/auth", authRoutes);
app.use("/api/burn", burnRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api", miscRoutes);
app.use("/api/vip", vipRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/staking", stakingRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/round", roundRoutes);

// ---- Error Handling ----
app.use(notFoundHandler);
app.use(errorHandler);

// ---- WebSocket ----
initWebSocket(httpServer);

// ---- Staking pools — ensure both pools exist at startup ----
import("./services/stakingService").then(({ StakingService }) => {
  StakingService.seedPools().catch((err: any) =>
    console.error("[Staking] Seed pools failed:", err.message)
  );
  console.log("[Staking] Pool seed complete");
});

// ---- Owner wallet validation ----
if (process.env.NODE_ENV === "production") {
  const missingWallets: string[] = [];
  if (!process.env.OWNER_1_WALLET) missingWallets.push("OWNER_1_WALLET");
  if (!process.env.OWNER_2_WALLET) missingWallets.push("OWNER_2_WALLET");
  if (!process.env.MASTER_KEYPAIR_SECRET) missingWallets.push("MASTER_KEYPAIR_SECRET");
  if (missingWallets.length > 0) {
    console.error(`[STARTUP] Missing critical wallet env vars: ${missingWallets.join(", ")}`);
    process.exit(1);
  }
}

// ---- Deposit Monitor — restart all wallet pollers on server start ----
import("./services/depositMonitorService").then(({ startAllDepositMonitors }) => {
  startAllDepositMonitors().catch((err: any) =>
    console.error("[DepositMonitor] Startup failed:", err.message)
  );
  console.log("[DepositMonitor] All deposit monitors started");
});

// ---- req #6: Background checker — auto-end time-expired rounds every 60 seconds ----
import("./services/roundService").then(({ RoundService }) => {
  setInterval(async () => {
    try {
      await RoundService.autoEndExpiredRounds();
    } catch (err: any) {
      console.error("[ROUND] Background expiry check failed:", err.message);
    }
  }, 60_000);
  console.log("[ROUND] Background expiry checker started (60s interval)");
});

// ---- Balance monitoring — alert owners when master wallet SOL/USDC is low ----
import("./services/monitoringService").then(({ startBalanceMonitoring }) => {
  startBalanceMonitoring();
});

// ---- VIP auto-renewal — check expired VIP subscriptions every hour ----
import("./services/vipService").then(({ VipService }) => {
  setInterval(async () => {
    try {
      const result = await VipService.processAutoRenewals();
      if (result.renewed > 0 || result.expired > 0) {
        console.log(`[VIP] Auto-renewal: renewed=${result.renewed}, expired=${result.expired}`);
      }
    } catch (err: any) {
      console.error("[VIP] Auto-renewal check failed:", err.message);
    }
  }, 60 * 60 * 1000); // every hour
  console.log("[VIP] Auto-renewal scheduler started (1h interval)");
});

// ---- Start Server ----
httpServer.listen(config.port, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║      🔥 ASHNANCE API SERVER 🔥       ║
  ╠═══════════════════════════════════════╣
  ║  Mode:     ${config.nodeEnv.padEnd(27)}║
  ║  Port:     ${String(config.port).padEnd(27)}║
  ║  Frontend: ${config.frontendUrl.padEnd(27)}║
  ╚═══════════════════════════════════════╝
  `);
});

export { app, httpServer };
