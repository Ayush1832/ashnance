import express from "express";
import cors from "cors";
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

// ---- Global Middleware ----
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
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
