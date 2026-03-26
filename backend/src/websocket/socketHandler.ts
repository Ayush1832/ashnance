import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import { config } from "../config";

let io: SocketServer | null = null;

/**
 * Initialize Socket.IO server for real-time events
 */
export function initWebSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Join user-specific room for targeted notifications
    socket.on("join:user", (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`[WS] User ${userId} joined room`);
    });

    // Join public rooms
    socket.on("join:ticker", () => {
      socket.join("ticker");
    });

    socket.on("join:leaderboard", () => {
      socket.join("leaderboard");
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  console.log("[WS] WebSocket server initialized");
  return io;
}

/**
 * Get the Socket.IO instance
 */
export function getIO(): SocketServer {
  if (!io) throw new Error("WebSocket not initialized");
  return io;
}

// ---- Event broadcasters ----

export function broadcastBurnEvent(data: {
  username: string;
  amount: number;
  isWinner: boolean;
  prize?: number;
  prizeTier?: string;
}) {
  if (!io) return;

  // Broadcast to live ticker
  io.to("ticker").emit("burn:new", {
    user: data.username,
    amount: data.amount,
    result: data.isWinner ? "win" : "burn",
    timestamp: new Date().toISOString(),
  });

  if (data.isWinner) {
    io.to("ticker").emit("win:new", {
      user: data.username,
      prize: data.prize,
      tier: data.prizeTier,
      timestamp: new Date().toISOString(),
    });

    // Update leaderboard
    io.to("leaderboard").emit("leaderboard:update");
  }
}

export function broadcastDepositEvent(userId: string, amount: number) {
  if (!io) return;
  io.to(`user:${userId}`).emit("deposit:confirmed", { amount });
}

export function broadcastReferralEvent(
  referrerId: string,
  amount: number,
  refereeUsername: string
) {
  if (!io) return;
  io.to(`user:${referrerId}`).emit("referral:earned", {
    amount,
    from: refereeUsername,
  });
}
