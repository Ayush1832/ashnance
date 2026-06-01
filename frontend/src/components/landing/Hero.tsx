"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Flame, ShieldCheck, Trophy } from "lucide-react";
import { AnimatedWords } from "@/components/motion/AnimatedText";
import { Magnetic } from "@/components/motion/Magnetic";
import { TiltCard } from "@/components/motion/TiltCard";
import { AuroraBackground } from "@/components/effects/AuroraBackground";
import { ParticleField } from "@/components/effects/ParticleField";
import { FireButton, GhostButton, RankBadge } from "@/components/ashnance/primitives";
import { EASE_OUT } from "@/lib/motion";
import { fmtUsd } from "@/lib/format";
import type { Round, RoundEntry } from "@/lib/types";

export function Hero({ round }: { round: Round | null }) {
  const heroRef = useRef<HTMLElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);

  // Copy drifts up + fades as you scroll past the hero.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const glowScale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);

  // The product preview "stands up" + scales in as it enters the viewport.
  const enter = useScroll({
    target: showcaseRef,
    offset: ["start 0.9", "start 0.35"],
  });
  const cardRotate = useTransform(enter.scrollYProgress, [0, 1], [14, 0]);
  const cardScale = useTransform(enter.scrollYProgress, [0, 1], [0.92, 1]);
  const cardY = useTransform(enter.scrollYProgress, [0, 1], [60, 0]);

  const pool = round?.prizePool ?? 0;
  const target = round?.prizePoolTarget ?? 500;
  const pct = target > 0 ? Math.min(100, (pool / target) * 100) : 0;
  const top3 = round?.leaderboard?.slice(0, 3) ?? [];

  return (
    <section ref={heroRef} className="relative overflow-hidden px-5 pb-24 pt-36 sm:pt-44">
      {/* ambient layers */}
      <AuroraBackground intensity={1.1} />
      <ParticleField className="opacity-70" count={52} />
      <motion.div
        aria-hidden
        style={{ scale: glowScale }}
        className="pointer-events-none absolute left-1/2 top-[-10%] -z-0 h-[60vh] w-[120vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(255,69,0,0.18),transparent_60%)] blur-2xl"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        {/* live status pill */}
        <motion.div
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
          className="mx-auto inline-flex items-center gap-2.5 rounded-full glass px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground"
        >
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-success" />
          </span>
          Live on Solana · USDC prize pools
        </motion.div>

        {/* headline */}
        <motion.h1
          style={{ y: copyY, opacity: copyOpacity }}
          className="mt-8 font-display text-[clamp(2.75rem,8vw,6.5rem)] font-extrabold leading-[0.92] tracking-tight"
        >
          <span className="block text-foreground">
            <AnimatedWords text="Burn USDC." delay={0.15} />
          </span>
          <span className="block text-foreground">
            <AnimatedWords text="Earn the weight." delay={0.32} />
          </span>
          <motion.span
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE_OUT, delay: 0.62 }}
            className="block text-molten text-glow"
          >
            Win the entire pool.
          </motion.span>
        </motion.h1>

        {/* subcopy */}
        <motion.p
          style={{ y: copyY, opacity: copyOpacity }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.8 }}
          className="mx-auto mt-7 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl"
        >
          Every round, one winner takes everything. Burn more, climb higher, and hold
          rank&nbsp;#1 when the pool fills — the entire prize settles to your wallet on-chain.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.95 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Magnetic strength={0.45}>
            <Link href="/register">
              <FireButton size="lg" className="group">
                Start burning
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </FireButton>
            </Link>
          </Magnetic>
          <Magnetic strength={0.3}>
            <Link href="/leaderboard">
              <GhostButton size="lg">View live leaderboard</GhostButton>
            </Link>
          </Magnetic>
        </motion.div>

        {/* trust line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: EASE_OUT, delay: 1.15 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-success" /> On-chain settlement</span>
          <span className="inline-flex items-center gap-1.5"><Trophy className="size-3.5 text-gold" /> One winner per round</span>
          <span className="inline-flex items-center gap-1.5"><Flame className="size-3.5 text-primary" /> Withdraw anytime</span>
        </motion.div>
      </div>

      {/* floating product preview */}
      <div ref={showcaseRef} className="relative z-10 mx-auto mt-16 max-w-4xl [perspective:1600px] sm:mt-20">
        <motion.div style={{ rotateX: cardRotate, scale: cardScale, y: cardY }} className="[transform-style:preserve-3d]">
          <TiltCard max={6} className="glass-card relative overflow-hidden rounded-[28px] p-1.5 shadow-[var(--shadow-fire)]">
            <div className="rounded-[22px] bg-[rgba(10,10,14,0.75)] p-4 sm:p-6">
              {/* preview chrome */}
              <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-danger/70" />
                  <span className="size-2.5 rounded-full bg-warning/70" />
                  <span className="size-2.5 rounded-full bg-success/70" />
                  <span className="ml-3 font-mono text-xs text-muted-foreground">ashnance.com/burn</span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-success">
                  <span className="size-1.5 animate-pulse rounded-full bg-success" /> Live
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-[1.1fr_1fr]">
                {/* pool */}
                <div className="rounded-2xl border border-border bg-white/[0.02] p-5">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Round&nbsp;#{round?.number ?? "—"} · Prize pool
                  </div>
                  <div className="mt-2 font-mono text-4xl font-bold text-foreground sm:text-5xl">{fmtUsd(pool)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">of {fmtUsd(target)} target</div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full progress-fire"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.3 }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                    <span>{pct.toFixed(1)}% filled</span>
                    <span className="text-fire">Winner takes all</span>
                  </div>
                </div>

                {/* leaderboard */}
                <div className="rounded-2xl border border-border bg-white/[0.02] p-5">
                  <div className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">Top weight</div>
                  <div className="space-y-2">
                    {(top3.length ? top3 : PLACEHOLDER).map((r, i) => (
                      <div key={r.userId ?? i} className="flex items-center gap-3">
                        <RankBadge rank={r.rank} />
                        <span className="truncate text-sm text-foreground">
                          {r.isAnonymous ? "Anonymous" : r.username}
                        </span>
                        <span className="ml-auto font-mono text-sm text-fire">{r.weight.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TiltCard>
          {/* reflection / floor glow */}
          <div className="pointer-events-none absolute -bottom-16 left-1/2 h-32 w-3/4 -translate-x-1/2 rounded-[50%] bg-primary/20 blur-3xl" />
        </motion.div>
      </div>
    </section>
  );
}

const PLACEHOLDER: RoundEntry[] = [
  { rank: 1, userId: "p1", username: "ember.sol", weight: 184.5, isAnonymous: false },
  { rank: 2, userId: "p2", username: "Anonymous", weight: 142.0, isAnonymous: true },
  { rank: 3, userId: "p3", username: "phoenix", weight: 98.25, isAnonymous: false },
];
