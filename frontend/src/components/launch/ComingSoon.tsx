"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";

export function ComingSoon() {
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

      <Image
        src="/logo.png"
        alt="Ashnance"
        width={112}
        height={112}
        priority
        className="h-20 w-20 sm:h-28 sm:w-28"
      />
      <div className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">Ashnance</div>

      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
        Burn-to-win on Solana
      </p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-6xl">
        Coming soon
      </h1>
      <p className="mt-5 max-w-md text-balance text-muted-foreground sm:text-lg">
        Ashnance isn&apos;t live yet. Leave your email and we&apos;ll let you know the day it opens.
      </p>

      <form onSubmit={submit} className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row">
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
          {status === "done" ? "Joined ✓" : status === "loading" ? "Joining…" : "Notify me"}
        </button>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">No spam — just one email when we open.</p>
    </main>
  );
}
