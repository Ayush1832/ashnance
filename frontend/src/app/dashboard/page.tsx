"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Flame, ArrowDown, ArrowUp, Zap, Sprout } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { GlassCard, FireButton, GhostButton, RankBadge, FireProgress } from "@/components/ashnance/primitives";
import { LiveBurnFeed } from "@/components/ashnance/LiveBurnFeed";
import { Reveal } from "@/components/motion/Reveal";
import { useAuth } from "@/hooks/useAuth";
import { fmtUsd, fmtNum, countdown } from "@/lib/format";
import { api } from "@/lib/apiClient";
import { socket } from "@/lib/socketClient";
import type { Round } from "@/lib/types";

export default function Dashboard() {
  const { user } = useAuth();
  const [boostLoading, setBoostLoading] = useState(false);
  const [round, setRound] = useState<Round | null>(null);

  useEffect(() => {
    api.currentRound()
      .then((res) => { if (res.success && res.data) setRound(res.data as Round); })
      .catch(() => {/* no active round */});
  }, []);

  // Keep round data live via socket
  useEffect(() => {
    const unProgress = socket.on("round:progress", (payload) => {
      const p = payload as { currentPool: number; targetPool: number; progressPercent: number; timestamp: string };
      setRound((prev) => prev ? {
        ...prev,
        prizePool: Number(p.currentPool),
        prizePoolTarget: Number(p.targetPool),
      } : prev);
    });
    const unBurn = socket.on("burn:new", () => {
      // burn:new carries no pool update — pool comes via round:progress
    });
    const unLeaderboard = socket.on("leaderboard:update", () => {
      // Backend sends no payload — re-fetch round to get updated leaderboard
      api.currentRound()
        .then((res) => { if (res.success && res.data) setRound(res.data as Round); })
        .catch(() => {});
    });
    const unEnded = socket.on("round:ended", () => {
      setRound((prev) => prev ? { ...prev, status: "ENDED" } : prev);
    });
    return () => { unProgress(); unBurn(); unLeaderboard(); unEnded(); };
  }, []);

  const me = round?.leaderboard?.find((r) => r.isYou);
  const top = round?.leaderboard?.[0];
  const hasBoost = !!user.ashBoostExpiresAt && new Date(user.ashBoostExpiresAt) > new Date();

  async function handleBoost() {
    if (user.ashBalance < 1000) { toast.error("Need 1,000 ASH to activate boost"); return; }
    setBoostLoading(true);
    try {
      await api.activateBoost();
      toast.success("🔥 Weight Boost active for 1 hour! +0.5 weight per burn");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Boost failed");
    }
    setBoostLoading(false);
  }

  return (
    <AppShell>
      <div className="relative">
        {/* ambient warmth behind the fold */}
        <div className="pointer-events-none absolute inset-x-0 -top-6 -z-10 h-72 bg-[radial-gradient(ellipse_70%_100%_at_50%_-20%,rgba(255,69,0,0.10),transparent_70%)]" />
        <Reveal>
          <div className="mb-7">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Dashboard</div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome back, <span className="text-fire">{user.username || "—"}</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {round ? `Round #${round.number} is live. Burn to climb.` : "No active round right now."}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <GlassCard className="card-glow">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">USDC Balance</div>
              <div className="mt-2 font-mono text-3xl font-semibold text-[oklch(0.7_0.13_245)]">${fmtNum(user.usdcBalance, 2)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Available to burn or withdraw</div>
              <div className="mt-4 flex gap-2">
                <Link href="/wallet" className="flex-1"><FireButton size="sm" className="w-full"><ArrowDown className="h-3 w-3"/> Deposit</FireButton></Link>
                <Link href="/wallet" className="flex-1"><GhostButton size="sm" className="w-full"><ArrowUp className="mr-1 inline h-3 w-3"/>Withdraw</GhostButton></Link>
              </div>
            </GlassCard>

            <GlassCard className="card-glow">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">ASH Balance</div>
              <div className="mt-2 font-mono text-3xl font-semibold text-ash">{fmtNum(user.ashBalance)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Earned from burns</div>
              <div className="mt-4 flex gap-2">
                <FireButton size="sm" className="w-full" onClick={handleBoost} disabled={boostLoading || hasBoost || user.ashBalance < 1000}>
                  <Zap className="h-3 w-3"/>
                  {hasBoost ? "Boosted ✓" : boostLoading ? "Activating…" : "Boost · 1k ASH"}
                </FireButton>
                <Link href="/staking" className="flex-1"><GhostButton size="sm" className="w-full"><Sprout className="mr-1 inline h-3 w-3"/>Stake</GhostButton></Link>
              </div>
            </GlassCard>

            <GlassCard className={me?.rank === 1 ? "card-glow ring-fire glow-gold" : "card-glow"}>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Your Position</div>
              <div className="mt-2 font-mono text-3xl font-semibold">{me ? `#${me.rank}` : "—"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Weight: <span className="font-mono text-foreground">{me?.weight.toFixed(2) ?? "0.00"}</span>
              </div>
              {me && top && me.rank > 1 && (
                <div className="text-xs text-muted-foreground">
                  Distance to #1: <span className="font-mono text-foreground">{(top.weight - me.weight).toFixed(2)}</span>
                </div>
              )}
              {me?.rank === 1 && <div className="mt-2 text-sm text-gold">You are rank #1! 🔥</div>}
            </GlassCard>
          </div>
        </Reveal>

        {round && (
          <Reveal delay={0.14}>
            <GlassCard ring className="mb-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="font-display text-xl font-semibold">Round #{round.number}</span>
                <span className="inline-flex h-5 items-center rounded border border-success/30 bg-success/15 px-2 text-[10px] font-semibold uppercase tracking-wider text-success">Active</span>
                {round.endsAt && <span className="ml-auto text-xs text-muted-foreground">Ends in {countdown(round.endsAt)}</span>}
              </div>
              <FireProgress value={round.prizePool} max={round.prizePoolTarget} />
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Current Prize</div>
                  <div className="font-mono text-3xl font-bold text-fire">{fmtUsd(round.prizePool)}</div>
                  <div className="text-xs text-muted-foreground">target {fmtUsd(round.prizePoolTarget)}</div>
                </div>
                <Link href="/burn"><FireButton size="lg"><Flame className="h-4 w-4"/> BURN NOW</FireButton></Link>
              </div>
            </GlassCard>
          </Reveal>
        )}

        <Reveal delay={0.18}>
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <GlassCard>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-lg font-semibold">Live Burns</span>
                {round && <span className="text-xs text-muted-foreground">{round.burnsLast60s} in last 60s</span>}
              </div>
              <LiveBurnFeed max={10} />
            </GlassCard>

            <GlassCard>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-lg font-semibold">
                  {round ? `Round #${round.number} Standings` : "Standings"}
                </span>
                <Link href="/leaderboard" className="text-xs text-muted-foreground transition-colors hover:text-foreground">See all →</Link>
              </div>
              {round ? (
                <div className="space-y-1.5">
                  {round.leaderboard.slice(0, 5).map((r) => (
                    <div key={r.userId} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${r.isYou ? "border border-primary/40 bg-[rgba(255,69,0,0.12)]" : "glass"}`}>
                      <RankBadge rank={r.rank} />
                      <span className="text-sm">{r.isAnonymous ? "Anonymous" : r.username}{r.isYou && " (you)"}</span>
                      <span className="ml-auto font-mono text-sm">{r.weight.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No active round</p>
              )}
            </GlassCard>
          </div>
        </Reveal>

        <Reveal delay={0.22}>
          <GlassCard>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="font-display text-lg font-semibold">Quick Burn</span>
              <span className="text-xs text-muted-foreground">Select an amount and go to the burn page</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[5,10,25,50,100].map((a) => (
                <Link key={a} href="/burn">
                  <GhostButton size="md">${a}</GhostButton>
                </Link>
              ))}
              <Link href="/burn"><FireButton><Flame className="h-3.5 w-3.5"/>Custom burn →</FireButton></Link>
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </AppShell>
  );
}
