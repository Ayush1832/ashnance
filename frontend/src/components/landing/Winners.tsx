"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { motion } from "framer-motion";
import { Reveal } from "@/components/motion/Reveal";
import { RankBadge } from "@/components/ashnance/primitives";
import { Eyebrow } from "./Parts";
import { EASE_OUT } from "@/lib/motion";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeaderboardRow } from "@/lib/types";

export function Winners({ winners }: { winners: LeaderboardRow[] }) {
  const list = winners.length ? winners : FALLBACK;
  const podium = [list[1], list[0], list[2]].filter(Boolean); // 2 · 1 · 3
  const rest = list.slice(3, 6);

  return (
    <section id="winners" className="relative mx-auto max-w-4xl px-5 py-28 sm:py-32">
      <div className="mb-14 flex flex-col items-center text-center">
        <Reveal><Eyebrow accent="gold">All-time winners</Eyebrow></Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            The Hall of <span className="text-gold">Fire</span>
          </h2>
        </Reveal>
        <Reveal delay={0.14}>
          <p className="mt-5 max-w-md text-muted-foreground">
            Real wallets, real on-chain payouts. Every name here held rank&nbsp;#1 when a pool
            filled — and walked away with the whole thing.
          </p>
        </Reveal>
      </div>

      {/* podium */}
      <div className="grid grid-cols-3 items-end gap-3 sm:gap-5">
        {podium.map((w) => {
          const first = w.rank === 1;
          return (
            <motion.div
              key={w.rank}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: first ? 0 : 0.12 }}
              className={cn(
                "glass-card relative flex flex-col items-center rounded-3xl px-3 py-6 text-center sm:px-5 sm:py-8",
                first ? "border-gold/30 shadow-[var(--shadow-gold)]" : "shadow-[var(--shadow-float)]",
              )}
            >
              {first && (
                <Crown className="absolute -top-4 size-7 text-gold drop-shadow-[0_0_10px_rgba(255,184,0,0.6)]" />
              )}
              <div className={cn("mb-3", first && "scale-125")}>
                <RankBadge rank={w.rank} />
              </div>
              <div className="max-w-full truncate text-sm font-medium">
                {w.anonymous ? "Anonymous" : w.username}
              </div>
              <div className={cn("mt-1 font-mono font-bold", first ? "text-2xl text-gold" : "text-lg text-foreground")}>
                ${fmtNum(w.primary, 2)}
              </div>
              {w.secondary !== undefined && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">{w.secondary} wins</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* runners-up */}
      {rest.length > 0 && (
        <div className="mt-4 space-y-2">
          {rest.map((w, i) => (
            <Reveal key={w.rank} delay={i * 0.05}>
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-white/[0.02] px-4 py-3">
                <RankBadge rank={w.rank} />
                <span className="truncate text-sm">{w.anonymous ? "Anonymous" : w.username}</span>
                <span className="ml-auto font-mono text-gold">${fmtNum(w.primary, 2)}</span>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/leaderboard"
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          See the full leaderboard →
        </Link>
      </div>
    </section>
  );
}

const FALLBACK: LeaderboardRow[] = [
  { rank: 1, username: "ember.sol", primary: 4820.5, secondary: 7 },
  { rank: 2, username: "Anonymous", primary: 3110.0, secondary: 4, anonymous: true },
  { rank: 3, username: "phoenix", primary: 2240.75, secondary: 3 },
  { rank: 4, username: "molten", primary: 1180.0, secondary: 2 },
  { rank: 5, username: "cinder", primary: 940.25, secondary: 1 },
];
