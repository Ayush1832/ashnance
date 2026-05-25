// Mock socket client. Emits fake real-time events to drive live UI.
// TODO: wire up real socket event handlers (socket.io-client to NEXT_PUBLIC_API_URL).

import { mockBurnFeed, usernamesList } from "./mock";
import type { BurnEvent } from "./types";

type EventName = "burn:new" | "leaderboard:update" | "round:progress" | "round:ended" | "deposit:confirmed" | "referral:earned";
type Handler = (payload: any) => void;

class MockSocket {
  private handlers = new Map<EventName, Set<Handler>>();
  private interval: ReturnType<typeof setInterval> | null = null;

  on(event: EventName, h: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(h);
    this.ensureRunning();
    return () => this.off(event, h);
  }
  off(event: EventName, h: Handler) { this.handlers.get(event)?.delete(h); }
  emit(event: EventName, payload: any) { this.handlers.get(event)?.forEach((h) => h(payload)); }

  private ensureRunning() {
    if (this.interval || typeof window === "undefined") return;
    // TODO: wire up real socket event
    this.interval = setInterval(() => {
      const amount = [5,10,25,50][Math.floor(Math.random()*4)];
      const ev: BurnEvent = {
        id: `b_${Date.now()}`,
        username: usernamesList[Math.floor(Math.random() * usernamesList.length)],
        amount,
        weight: +(amount / 4.99).toFixed(2),
        ash: amount,
        at: Date.now(),
      };
      this.emit("burn:new", ev);
      this.emit("round:progress", { delta: amount * 0.4 });
      this.emit("leaderboard:update", {});
    }, 3500);
  }
}

export const socket = new MockSocket();
export { mockBurnFeed };
