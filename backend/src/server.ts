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

// ============================================================
// Express App
// ============================================================
const app = express();
const httpServer = createServer(app);

// ---- Global Middleware ----
app.use(cors({
  origin: config.frontendUrl,
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

// ---- Error Handling ----
app.use(notFoundHandler);
app.use(errorHandler);

// ---- WebSocket ----
initWebSocket(httpServer);

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
