"use client";

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/ashnance/Logo";
import { api } from "@/lib/apiClient";

function useCountdown(target: string | null) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0, done: !target });

  useEffect(() => {
    if (!target) {
      setParts({ d: 0, h: 0, m: 0, s: 0, done: true });
      return;
    }
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setParts({ d: 0, h: 0, m: 0, s: 0, done: true });
        return;
      }
      setParts({
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff % 86_400_000) / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
        done: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return parts;
}

function TimeCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="glass-card flex h-16 w-16 items-center justify-center rounded-2xl font-mono text-2xl font-bold tabular-nums sm:h-20 sm:w-20 sm:text-4xl">
        {String(value).padStart(2, "0")}
      </div>
      <span className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
        {label}
      </span>
    </div>
  );
}

export function ComingSoon({ launchAt }: { launchAt: string | null }) {
  const { d, h, m, s, done } = useCountdown(launchAt);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setStatus("loading");
    try {
      const res = await api.subscribe(trimmed);
      setStatus("done");
      toast.success(
        res.data.alreadySubscribed
          ? "You're already on the list."
          : "You're on the list — we'll be in touch.",
      );
    } catch (err) {
      setStatus("idle");
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {/* ambient ember glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-primary/10 blur-[120px]"
      />

      <Logo size="lg" href="/" />

      <p className="mt-10 text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
        Burn to win · Solana
      </p>
      <h1 className="mt-4 max-w-2xl text-balance font-display text-4xl font-bold tracking-tight sm:text-6xl">
        The Ritual Begins Soon
      </h1>
      <p className="mt-5 max-w-md text-balance text-muted-foreground sm:text-lg">
        Ashnance is preparing for launch. Join the waitlist to be among the first
        to enter the arena — and get notified the moment we go live.
      </p>

      {launchAt && !done && (
        <div className="mt-12 flex items-center gap-3 sm:gap-5">
          <TimeCell value={d} label="Days" />
          <TimeCell value={h} label="Hours" />
          <TimeCell value={m} label="Minutes" />
          <TimeCell value={s} label="Seconds" />
        </div>
      )}
      {launchAt && done && (
        <p className="mt-12 font-display text-2xl font-semibold text-primary">
          We&apos;re live — refresh to enter 🔥
        </p>
      )}

      <form onSubmit={submit} className="mt-12 flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          disabled={status === "done"}
          className="h-12 flex-1 rounded-full border border-border bg-white/[0.03] px-5 text-sm outline-none transition focus:border-primary/50 focus:bg-white/[0.05] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status !== "idle"}
          className="h-12 shrink-0 rounded-full bg-fire px-7 font-semibold text-background shadow-[0_6px_22px_-8px_rgba(255,69,0,0.65)] transition hover:-translate-y-0.5 hover:glow-fire disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {status === "done" ? "Joined ✓" : status === "loading" ? "Joining…" : "Join Waitlist"}
        </button>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">No spam. One email when we launch.</p>
    </main>
  );
}
