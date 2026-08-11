import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { config } from "../config";

let io: SocketServer | null = null;

/**
 * Initialize Socket.IO server for real-time events
 */
export function initWebSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: config.corsOrigins,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Extract userId from JWT handshake — never trust client-supplied userId
    const token = socket.handshake.auth?.token as string | undefined;
    let authedUserId: string | null = null;
    if (token) {
      try {
        const payload = jwt.verify(token, config.jwt.secret) as { userId: string };
        authedUserId = payload.userId;
        socket.join(`user:${authedUserId}`);
        console.log(`[WS] User ${authedUserId} joined private room`);
      } catch {
        // Invalid token — socket is still allowed for public rooms
      }
    }

    // join:user is removed — clients must pass token via handshake.auth.token
    // The private room is already joined above when the token is valid.

    // Join public rooms
    socket.on("join:ticker", () => {
      socket.join("ticker");
    });

    socket.on("join:leaderboard", () => {
      socket.join("leaderboard");
    });

    socket.on("join:round", () => {
      socket.join("round");
    });

    // Creator Pools — scoped per-pool room, additive to the rooms above.
    // Never joins/emits into ticker/leaderboard/round (Global Pool rooms).
    socket.on("join:pool", (poolId: string) => {
      if (typeof poolId === "string" && poolId.length > 0) {
        socket.join(`pool:${poolId}`);
      }
    });
    socket.on("leave:pool", (poolId: string) => {
      if (typeof poolId === "string" && poolId.length > 0) {
        socket.leave(`pool:${poolId}`);
      }
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

/**
 * Broadcast a burn event to the live ticker and update leaderboard.
 * Round-based system: every burn earns ASH, no per-burn win.
 */
export function broadcastBurnEvent(data: {
  username: string;
  amount: number;
  ashReward: number;
  finalWeight: number;
  roundCurrentPool: number;
  roundTargetPool: number;
  roundProgressPercent: number;
}) {
  if (!io) return;

  io.to("ticker").emit("burn:new", {
    user:      data.username,
    amount:    data.amount,
    ashReward: data.ashReward,
    weight:    data.finalWeight,
    timestamp: new Date().toISOString(),
  });

  // Push updated round progress to anyone watching the round room
  io.to("round").emit("round:progress", {
    currentPool:     data.roundCurrentPool,
    targetPool:      data.roundTargetPool,
    progressPercent: data.roundProgressPercent,
    timestamp:       new Date().toISOString(),
  });

  // Trigger leaderboard refresh
  io.to("leaderboard").emit("leaderboard:update");
}

/**
 * Broadcast a round-end event when a round concludes and a winner is paid.
 */
export function broadcastRoundEndEvent(data: {
  roundNumber: number;
  winnerUsername: string;
  prizeAmount: number;
}) {
  if (!io) return;

  const payload = {
    roundNumber:     data.roundNumber,
    winner:          data.winnerUsername,
    prize:           data.prizeAmount,
    timestamp:       new Date().toISOString(),
  };

  // Announce to everyone
  io.to("ticker").emit("round:ended", payload);
  io.to("round").emit("round:ended", payload);
  io.to("leaderboard").emit("round:ended", payload);
}

/**
 * Broadcast a round-created event so all connected clients know a new round started.
 */
export function broadcastRoundCreatedEvent(roundNumber: number, prizePoolTarget: number) {
  if (!io) return;
  const payload = {
    roundNumber,
    prizePoolTarget,
    timestamp: new Date().toISOString(),
  };
  io.to("ticker").emit("round:created", payload);
  io.to("round").emit("round:created", payload);
  io.to("leaderboard").emit("round:created", payload);
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

// ---- Creator Pools broadcasters (isolated `pool:{poolId}` room) ----

export function broadcastCreatorPoolContribution(
  poolId: string,
  data: { username: string; amount: number; poolCurrentValue: number }
) {
  if (!io) return;
  io.to(`pool:${poolId}`).emit("creatorPool:contribution", {
    user: data.username,
    amount: data.amount,
    poolCurrentValue: data.poolCurrentValue,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastCreatorPoolProgress(
  poolId: string,
  data: { poolCurrentValue: number; participantCount: number }
) {
  if (!io) return;
  io.to(`pool:${poolId}`).emit("creatorPool:progress", {
    poolCurrentValue: data.poolCurrentValue,
    participantCount: data.participantCount,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastCreatorPoolBattle(
  poolId: string,
  data: { actor: string; actionType: string; targetUserId?: string; weightDelta: number }
) {
  if (!io) return;
  io.to(`pool:${poolId}`).emit("creatorPool:battle", {
    actor: data.actor,
    actionType: data.actionType,
    targetUserId: data.targetUserId,
    weightDelta: data.weightDelta,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastCreatorPoolStarted(poolId: string, poolName: string) {
  if (!io) return;
  io.to(`pool:${poolId}`).emit("creatorPool:started", { poolName, timestamp: new Date().toISOString() });
}

export function broadcastCreatorPoolEnded(poolId: string, poolName: string) {
  if (!io) return;
  io.to(`pool:${poolId}`).emit("creatorPool:ended", { poolName, timestamp: new Date().toISOString() });
}

export function broadcastCreatorPoolWinner(
  poolId: string,
  data: { winnerUsername: string; prizeAmount: number }
) {
  if (!io) return;
  io.to(`pool:${poolId}`).emit("creatorPool:winner", {
    winner: data.winnerUsername,
    prize: data.prizeAmount,
    timestamp: new Date().toISOString(),
  });
}
