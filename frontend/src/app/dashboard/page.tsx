"use client";

import { useState } from "react";
import Link from "next/link";
import { Flame, ArrowDown, ArrowUp, Zap, Sprout } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/ashnance/AppShell";
import { GlassCard, FireButton, GhostButton, RankBadge, FireProgress } from "@/components/ashnance/primitives";
import { LiveBurnFeed } from "@/components/ashnance/LiveBurnFeed";
import { useAuth } from "@/hooks/useAuth";
import { mockRound } from "@/lib/mock";
import { fmtUsd, fmtNum, countdown } from "@/lib/format";
import { api } from "@/lib/apiClient";

export default function Dashboard() {
  const { user } = useAuth();
  const [boostLoading, setBoostLoading] = useState(false);
  const me = mockRound.leaderboard.find((r) => r.isYou);
  const top = mockRound.leaderboard[0];
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
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back, {user.username}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Round #{mockRound.number} is live. Burn to climb.</p>
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
          {me && me.rank > 1 && (
            <div className="text-xs text-muted-foreground">
              Distance to #1: <span className="font-mono text-foreground">{(top.weight - me.weight).toFixed(2)}</span>
            </div>
          )}
          {me?.rank === 1 && <div className="text-gold text-sm mt-2">You are rank #1! 🔥</div>}
        </GlassCard>
      </div>

      <GlassCard ring className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-display text-xl font-semibold">Round #{mockRound.number}</span>
          <span className="inline-flex items-center px-2 h-5 rounded text-[10px] font-semibold uppercase tracking-wider border bg-success/15 text-success border-success/30">Active</span>
          <span className="ml-auto text-xs text-muted-foreground">Ends in {countdown(mockRound.endsAt!)}</span>
        </div>
        <FireProgress value={mockRound.prizePool} max={mockRound.prizePoolTarget} />
        <div className="mt-4 flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Current Prize</div>
            <div className="font-mono text-3xl font-bold text-fire">{fmtUsd(mockRound.prizePool)}</div>
            <div className="text-xs text-muted-foreground">target {fmtUsd(mockRound.prizePoolTarget)}</div>
          </div>
          <Link href="/burn"><FireButton size="lg"><Flame className="h-4 w-4"/> BURN NOW</FireButton></Link>
        </div>
      </GlassCard>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-lg font-semibold">Live Burns</span>
            <span className="text-xs text-muted-foreground">{mockRound.burnsLast60s} in last 60s</span>
          </div>
          <LiveBurnFeed max={10} />
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-lg font-semibold">Round #{mockRound.number} Standings</span>
            <Link href="/leaderboard" className="text-xs text-muted-foreground hover:text-foreground">See all →</Link>
          </div>
          <div className="space-y-1.5">
            {mockRound.leaderboard.slice(0, 5).map((r) => (
              <div key={r.userId} className={`flex items-center gap-3 px-3 py-2.5 rounded-md ${r.isYou ? "bg-[rgba(255,69,0,0.12)] border border-primary/40" : "glass"}`}>
                <RankBadge rank={r.rank} />
                <span className="text-sm">{r.isAnonymous ? "Anonymous" : r.username}{r.isYou && " (you)"}</span>
                <span className="ml-auto font-mono text-sm">{r.weight.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <span className="font-display text-lg font-semibold">Quick Burn</span>
          <span className="text-xs text-muted-foreground">Burn ~5 USDC → +1.00 weight, +500 ASH</span>
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
