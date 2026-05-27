"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Flame, ArrowDown, ArrowUp, Zap, Sprout } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { GlassCard, FireButton, GhostButton, RankBadge, FireProgress } from "@/components/ashnance/primitives";
import { LiveBurnFeed } from "@/components/ashnance/LiveBurnFeed";
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

  const me = round?.leaderboard.find((r) => r.isYou);
  const top = round?.leaderboard[0];
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
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back, {user.username || "—"}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {round ? `Round #${round.number} is live. Burn to climb.` : "No active round right now."}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <GlassCard>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">USDC Balance</div>
          <div className="mt-2 text-3xl font-mono font-semibold text-[oklch(0.7_0.13_245)]">${fmtNum(user.usdcBalance, 2)}</div>
          <div className="text-xs text-muted-foreground mt-1">Available to burn or withdraw</div>
          <div className="mt-4 flex gap-2">
            <Link href="/wallet" className="flex-1"><FireButton size="sm" className="w-full"><ArrowDown className="h-3 w-3"/> Deposit</FireButton></Link>
            <Link href="/wallet" className="flex-1"><GhostButton size="sm" className="w-full"><ArrowUp className="h-3 w-3 inline mr-1"/>Withdraw</GhostButton></Link>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">ASH Balance</div>
          <div className="mt-2 text-3xl font-mono font-semibold text-ash">{fmtNum(user.ashBalance)}</div>
          <div className="text-xs text-muted-foreground mt-1">Earned from burns</div>
          <div className="mt-4 flex gap-2">
            <FireButton size="sm" className="w-full" onClick={handleBoost} disabled={boostLoading || hasBoost || user.ashBalance < 1000}>
              <Zap className="h-3 w-3"/>
              {hasBoost ? "Boosted ✓" : boostLoading ? "Activating…" : "Boost · 1k ASH"}
            </FireButton>
            <Link href="/staking" className="flex-1"><GhostButton size="sm" className="w-full"><Sprout className="h-3 w-3 inline mr-1"/>Stake</GhostButton></Link>
          </div>
        </GlassCard>

        <GlassCard className={me?.rank === 1 ? "ring-fire glow-gold" : undefined}>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Your Position</div>
          <div className="mt-2 text-3xl font-mono font-semibold">{me ? `#${me.rank}` : "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Weight: <span className="font-mono text-foreground">{me?.weight.toFixed(2) ?? "0.00"}</span>
          </div>
          {me && top && me.rank > 1 && (
            <div className="text-xs text-muted-foreground">
              Distance to #1: <span className="font-mono text-foreground">{(top.weight - me.weight).toFixed(2)}</span>
            </div>
          )}
          {me?.rank === 1 && <div className="text-gold text-sm mt-2">You are rank #1! 🔥</div>}
        </GlassCard>
      </div>

      {round && (
        <GlassCard ring className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-display text-xl font-semibold">Round #{round.number}</span>
            <span className="inline-flex items-center px-2 h-5 rounded text-[10px] font-semibold uppercase tracking-wider border bg-success/15 text-success border-success/30">Active</span>
            {round.endsAt && <span className="ml-auto text-xs text-muted-foreground">Ends in {countdown(round.endsAt)}</span>}
          </div>
          <FireProgress value={round.prizePool} max={round.prizePoolTarget} />
          <div className="mt-4 flex items-end justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Current Prize</div>
              <div className="font-mono text-3xl font-bold text-fire">{fmtUsd(round.prizePool)}</div>
              <div className="text-xs text-muted-foreground">target {fmtUsd(round.prizePoolTarget)}</div>
            </div>
            <Link href="/burn"><FireButton size="lg"><Flame className="h-4 w-4"/> BURN NOW</FireButton></Link>
          </div>
        </GlassCard>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-lg font-semibold">Live Burns</span>
            {round && <span className="text-xs text-muted-foreground">{round.burnsLast60s} in last 60s</span>}
          </div>
          <LiveBurnFeed max={10} />
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-lg font-semibold">
              {round ? `Round #${round.number} Standings` : "Standings"}
            </span>
            <Link href="/leaderboard" className="text-xs text-muted-foreground hover:text-foreground">See all →</Link>
          </div>
          {round ? (
            <div className="space-y-1.5">
              {round.leaderboard.slice(0, 5).map((r) => (
                <div key={r.userId} className={`flex items-center gap-3 px-3 py-2.5 rounded-md ${r.isYou ? "bg-[rgba(255,69,0,0.12)] border border-primary/40" : "glass"}`}>
                  <RankBadge rank={r.rank} />
                  <span className="text-sm">{r.isAnonymous ? "Anonymous" : r.username}{r.isYou && " (you)"}</span>
                  <span className="ml-auto font-mono text-sm">{r.weight.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No active round</p>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <span className="font-display text-lg font-semibold">Quick Burn</span>
          <span className="text-xs text-muted-foreground">Select an amount and go to the burn page</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[5,10,25,50,100].map((a) => (
            <Link key={a} href="/burn">
              <GhostButton size="md">${a}</GhostButton>
            </Link>
          ))}
          <Link href="/burn"><FireButton><Flame className="h-3.5 w-3.5"/>Custom burn →</FireButton></Link>
        </div>
      </GlassCard>
    </AppShell>
  );
}
