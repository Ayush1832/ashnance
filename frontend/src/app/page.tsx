"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, Trophy, Wallet, Zap, Sprout, Send, Sparkles } from "lucide-react";
import { Logo } from "@/components/ashnance/Logo";
import { RoundProgressRing } from "@/components/ashnance/RoundProgressRing";
import { FireButton, GhostButton, GlassCard, RankBadge } from "@/components/ashnance/primitives";
import { api } from "@/lib/apiClient";
import { fmtUsd, fmtNum } from "@/lib/format";
import type { Round, LeaderboardRow } from "@/lib/types";

export default function LandingPage() {
  const [round, setRound] = useState<Round | null>(null);
  const [winners, setWinners] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    api.publicRound()
      .then((res) => { if (res.success && res.data) setRound(res.data as Round); })
      .catch(() => {});
    api.leaderboard("winners")
      .then((res) => { if (res.success && res.data) setWinners(res.data as LeaderboardRow[]); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      {/* NAV */}
      <header className="absolute top-0 inset-x-0 z-30 px-6 py-5 flex items-center justify-between">
        <Logo size="md" />
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#how" className="hover:text-foreground">How it works</a>
          <Link href="/leaderboard" className="hover:text-foreground">Leaderboard</Link>
          <a href="#ash" className="hover:text-foreground">ASH</a>
          <a href="#vip" className="hover:text-foreground">VIP</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground hidden sm:block">Log in</Link>
          <Link href="/register">
            <FireButton size="sm">Start Competing →</FireButton>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-fire-radial" />
        <div className="absolute inset-0 ember-bg" />
        <div className="relative z-10 max-w-5xl mx-auto text-center pt-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Powered by Solana · USDC Prize Pools
          </div>
          <h1 className="font-display text-6xl md:text-8xl font-extrabold tracking-tight leading-[0.95]">
            BURN USDC.<br />
            EARN WEIGHT.<br />
            <span className="text-fire">WIN THE POOL.</span>
          </h1>
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Every round, one winner takes everything. Burn more, climb higher, hold rank #1 when the pool fills — and the prize is yours.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register"><FireButton size="lg">Start Competing <ArrowRight className="h-4 w-4" /></FireButton></Link>
            <a href="#how"><GhostButton size="lg">How It Works</GhostButton></a>
          </div>
          {round && (
            <div className="mt-12 inline-flex items-center gap-4 px-5 py-3 rounded-full glass text-sm">
              <span className="text-muted-foreground">Round #{round.number}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span className="font-mono">Pool: <span className="text-fire font-semibold">{fmtUsd(round.prizePool)}</span> / {fmtUsd(round.prizePoolTarget)}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span className="text-muted-foreground"><span className="text-success">●</span> {round.leaderboard.length} active</span>
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.2em] text-primary mb-3">How it works</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Three steps. One winner.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: "01", icon: <Wallet className="h-7 w-7" />, title: "Deposit USDC", body: "Fund your account with USDC. Minimum $1 deposit. Withdrawals anytime (requires 2FA)." },
            { n: "02", icon: <Flame className="h-7 w-7" />, title: "Burn & earn weight", body: "Every burn spends USDC and earns you WEIGHT — your competitive rank score — plus ASH tokens. Bigger burns, VIP, active referrals, and boost all multiply your weight." },
            { n: "03", icon: <Trophy className="h-7 w-7" />, title: "Top weight wins", body: "When the prize pool hits its target, the #1 weight holder wins everything on-chain. Winner resets to 0, everyone else decays 10%. New round starts immediately." },
          ].map((s) => (
            <GlassCard key={s.n} className="p-7 h-full">
              <div className="text-[11px] font-mono text-primary tracking-widest">{s.n}</div>
              <div className="mt-3 text-primary">{s.icon}</div>
              <div className="mt-4 font-display text-xl font-semibold">{s.title}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* LIVE ROUND */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Live now</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Prize pool is filling.</h2>
            <p className="mt-4 text-muted-foreground">The current round is open. Burns are coming in. Climb the leaderboard before the pool tops out.</p>
            {round && (
              <div className="mt-6 space-y-2">
                {round.leaderboard.slice(0, 3).map((r) => (
                  <div key={r.userId} className="flex items-center gap-3 px-4 py-2.5 rounded-md glass">
                    <RankBadge rank={r.rank} />
                    <span className="text-sm">{r.isAnonymous ? "Anonymous" : r.username}</span>
                    <span className="ml-auto font-mono text-sm text-primary">{r.weight.toFixed(2)} weight</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6"><Link href="/leaderboard"><GhostButton>View full leaderboard →</GhostButton></Link></div>
          </div>
          <div className="flex justify-center"><RoundProgressRing size={320} round={round} /></div>
        </div>
      </section>

      {/* POOL SPLIT */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Pool mechanics</div>
          <h2 className="font-display text-4xl font-bold tracking-tight">Where your USDC goes</h2>
        </div>
        <GlassCard className="p-8">
          <div className="flex h-12 rounded-md overflow-hidden">
            <div className="bg-fire flex items-center justify-center text-xs font-semibold text-background" style={{ width: "40%" }}>40% Prize Pool</div>
            <div className="bg-[oklch(0.35_0.04_280)] flex items-center justify-center text-xs font-medium" style={{ width: "40%" }}>40% Platform</div>
            <div className="bg-[oklch(0.55_0.18_300)] flex items-center justify-center text-xs font-semibold text-background" style={{ width: "20%" }}>20% Referral</div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-8 text-sm">
            <div><div className="text-fire font-semibold mb-1">40% → Prize Pool</div><p className="text-muted-foreground">Funds the winner payout each round.</p></div>
            <div><div className="font-semibold mb-1">40% → Platform</div><p className="text-muted-foreground">Powers the protocol — profit pool.</p></div>
            <div><div className="text-[oklch(0.7_0.18_300)] font-semibold mb-1">20% → Referral</div><p className="text-muted-foreground">Pays out referral commissions to those who brought new burners.</p></div>
          </div>
        </GlassCard>
      </section>

      {/* ASH */}
      <section id="ash" className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.2em] text-ash mb-3">ASH Token</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Earn ASH. Use ASH. Grow ASH.</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { icon: <Flame className="h-5 w-5"/>, title: "Earn",  body: "Every burn gives you ASH tokens. Rewards halve every 100M ASH emitted." },
            { icon: <Zap className="h-5 w-5"/>,   title: "Boost", body: "Spend 1,000 ASH → +0.50 weight bonus for 1 hour." },
            { icon: <Sprout className="h-5 w-5"/>,title: "Stake", body: "Lock ASH in pools for up to 30% APY passive yield." },
            { icon: <Send className="h-5 w-5"/>,  title: "Claim", body: "Transfer ASH to your Solana wallet anytime." },
          ].map((c) => (
            <GlassCard key={c.title}>
              <div className="text-ash">{c.icon}</div>
              <div className="mt-3 font-semibold">{c.title}</div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{c.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* VIP */}
      <section id="vip" className="px-6 py-24 max-w-3xl mx-auto">
        <GlassCard ring className="p-10 text-center">
          <div className="inline-flex items-center gap-2 text-fire mb-4"><Sparkles className="h-5 w-5"/> <span className="font-display text-2xl">Holy Fire VIP</span></div>
          <div className="font-mono text-5xl font-bold">$24.99<span className="text-base text-muted-foreground"> / 30 days</span></div>
          <div className="mt-6 grid sm:grid-cols-3 gap-3 text-sm">
            <div className="glass rounded-md p-3">+0.50 weight per burn</div>
            <div className="glass rounded-md p-3">+20% ASH per burn</div>
            <div className="glass rounded-md p-3">VIP profile badge</div>
          </div>
          <div className="mt-8"><Link href="/register"><FireButton size="lg">Upgrade to VIP</FireButton></Link></div>
        </GlassCard>
      </section>

      {/* WINNERS */}
      <section className="px-6 py-24 max-w-4xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3">All-time winners</div>
            <h2 className="font-display text-4xl font-bold tracking-tight">Hall of Fire</h2>
          </div>
          <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground">View full →</Link>
        </div>
        {winners.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-2">
            {winners.slice(0, 5).map((r) => (
              <div key={r.rank} className="flex items-center gap-4 px-4 py-3 rounded-md glass">
                <RankBadge rank={r.rank} />
                <span className="font-medium">{r.anonymous ? "Anonymous" : r.username}</span>
                <span className="ml-auto font-mono text-gold">${fmtNum(r.primary, 2)}</span>
                {r.secondary !== undefined && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">{r.secondary} wins</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-12 border-t border-border mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div className="text-xs text-muted-foreground">Ashnance · Competitive Burn-to-Earn · Powered by Solana</div>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <Link href="/leaderboard" className="hover:text-foreground">Leaderboard</Link>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#" className="hover:text-foreground">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
