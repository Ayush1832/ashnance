"use client";

import Link from "next/link";
import { ArrowLeft, Flame, Trophy, Zap } from "lucide-react";
import { FlameCanvas } from "@/components/effects/FlameCanvas";

export function AuthShell({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "login" | "register";
}) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Layered background — radial + embers + scanlines */}
      <div className="absolute inset-0 bg-fire-radial pointer-events-none" />
      <div className="absolute inset-0 ember-bg pointer-events-none" />

      {/* Top nav with back link */}
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-10 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition tracking-wider"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          BACK TO HOME
        </Link>
        <div className="flex items-center gap-2 font-display font-bold tracking-tight">
          <span className="text-xl">🔥</span>
          <span className="hidden sm:inline">Ashnance</span>
        </div>
      </header>

      {/* Main two-column grid: brand showcase | auth card */}
      <div className="relative z-10 min-h-[calc(100vh-80px)] grid lg:grid-cols-[1.1fr_minmax(0,1fr)] gap-0 px-5 sm:px-10 pb-10">
        {/* ── LEFT: Brand showcase (hidden on mobile, shown on lg+) ── */}
        <div className="hidden lg:flex relative flex-col justify-center pr-12">
          {/* Flame canvas behind the text — masked to bottom 70% of column */}
          <div className="absolute inset-x-0 bottom-0 top-1/4 opacity-90 pointer-events-none">
            <FlameCanvas className="w-full h-full" />
          </div>
          {/* Soft fade so text stays readable above the flame */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live on Solana
            </div>

            <h1 className="font-display text-6xl xl:text-7xl font-extrabold tracking-tight leading-[0.95]">
              {variant === "register" ? (
                <>
                  IGNITE YOUR<br />
                  <span className="text-fire">FIRST BURN.</span>
                </>
              ) : variant === "login" ? (
                <>
                  WELCOME<br />
                  <span className="text-fire">BACK TO THE FIRE.</span>
                </>
              ) : (
                <>
                  BURN USDC.<br />
                  <span className="text-fire">WIN THE POOL.</span>
                </>
              )}
            </h1>

            <p className="mt-6 text-base text-muted-foreground max-w-md leading-relaxed">
              Every round, one winner takes everything. Burn more USDC, climb higher, hold rank #1 when the pool fills — and the prize is yours.
            </p>

            {/* Quick value props */}
            <div className="mt-10 space-y-4 max-w-md">
              <ValueProp
                icon={<Flame className="h-4 w-4 text-fire" />}
                title="Burn to compete"
                desc="Each burn earns weight + ASH tokens. Higher rank = bigger payout."
              />
              <ValueProp
                icon={<Trophy className="h-4 w-4 text-gold" />}
                title="Winner takes the pool"
                desc="Hold rank #1 when the prize pool fills — claim the full USDC prize on-chain."
              />
              <ValueProp
                icon={<Zap className="h-4 w-4 text-ash" />}
                title="ASH token rewards"
                desc="Stack ASH on every burn. Stake, boost, or claim to your wallet anytime."
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Auth card ── */}
        <div className="flex items-center justify-center w-full">
          <div className="w-full max-w-md">
            {/* Mobile brand header — shows above the card on small screens */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Live on Solana
              </div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight">
                {variant === "register" ? (
                  <>Ignite your <span className="text-fire">first burn</span></>
                ) : variant === "login" ? (
                  <>Welcome back to <span className="text-fire">the fire</span></>
                ) : (
                  <>Burn USDC. <span className="text-fire">Win the pool.</span></>
                )}
              </h1>
            </div>

            {/* The card itself */}
            <div className="relative">
              {/* Soft outer glow behind the card */}
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-fire-from/15 via-transparent to-gold/10 blur-2xl pointer-events-none" />
              <div className="relative glass-elevated ring-fire rounded-2xl p-7 sm:p-8">
                {children}
              </div>
            </div>

            {/* Footer note */}
            <p className="mt-6 text-center text-[11px] text-muted-foreground tracking-wide">
              By continuing you agree to our <Link href="/" className="text-foreground hover:text-fire">Terms</Link> and <Link href="/" className="text-foreground hover:text-fire">Privacy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueProp({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3.5 group">
      <div className="shrink-0 w-9 h-9 rounded-lg glass flex items-center justify-center mt-0.5 group-hover:glow-fire transition-shadow">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
