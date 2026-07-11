// Real Socket.IO client connecting to the backend at NEXT_PUBLIC_API_URL.

import { io, Socket as IOSocket } from "socket.io-client";

type EventName =
  | "burn:new"
  | "leaderboard:update"
  | "round:progress"
  | "round:ended"
  | "round:created"
  | "deposit:confirmed"
  | "referral:earned";

type Handler = (payload: unknown) => void;

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

class AppSocket {
  private _socket: IOSocket | null = null;
  private _handlers = new Map<EventName, Set<Handler>>();
  private _connected = false;

  private getSocket(): IOSocket | null {
    if (typeof window === "undefined") return null;
    if (this._socket) return this._socket;

    const accessToken = localStorage.getItem("accessToken");

    this._socket = io(BASE, {
      auth: accessToken ? { token: accessToken } : undefined,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this._socket.on("connect", () => {
      this._connected = true;
      // Join public rooms
      this._socket!.emit("join:ticker");
      this._socket!.emit("join:round");
      this._socket!.emit("join:leaderboard");
    });

    this._socket.on("disconnect", () => {
      this._connected = false;
    });

    // Forward all events to local handlers
    const events: EventName[] = [
      "burn:new",
      "leaderboard:update",
      "round:progress",
      "round:ended",
      "round:created",
      "deposit:confirmed",
      "referral:earned",
    ];
    for (const evt of events) {
      this._socket.on(evt, (payload: unknown) => {
        this._handlers.get(evt)?.forEach((h) => h(payload));
      });
    }

    return this._socket;
  }

  on(event: EventName, h: Handler): () => void {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event)!.add(h);
    this.getSocket(); // ensure connected
    return () => this.off(event, h);
  }

  off(event: EventName, h: Handler) {
    this._handlers.get(event)?.delete(h);
  }

  emit(event: EventName, payload: unknown) {
    this._handlers.get(event)?.forEach((h) => h(payload));
  }

  disconnect() {
    this._socket?.disconnect();
    this._socket = null;
    this._connected = false;
  }
}

export const socket = new AppSocket();
