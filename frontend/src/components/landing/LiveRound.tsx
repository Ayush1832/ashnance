"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { RoundProgressRing } from "@/components/ashnance/RoundProgressRing";
import { GhostButton, RankBadge } from "@/components/ashnance/primitives";
import { Eyebrow } from "./Parts";
import { EASE_OUT } from "@/lib/motion";
import type { Round, RoundEntry } from "@/lib/types";

export function LiveRound({ round }: { round: Round | null }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const ringScale = useTransform(scrollYProgress, [0, 1], [0.82, 1]);
  const ringOpacity = useTransform(scrollYProgress, [0, 0.6], [0, 1]);

  const top = round?.leaderboard?.slice(0, 4) ?? [];

  return (
    <section ref={ref} className="relative mx-auto max-w-6xl px-5 py-28 sm:py-32">
      <div className="grid items-center gap-14 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -36 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "0px 0px -20% 0px" }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
        >
          <Eyebrow accent="success">Live now</Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            The pool is <span className="text-fire">filling</span>.
          </h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            A round is open right now and burns are landing live. Climb the leaderboard
            before the pool tops out — the moment it does, rank&nbsp;#1 takes everything.
          </p>

          <div className="mt-8 space-y-2.5">
            {(top.length ? top : FALLBACK).map((r, i) => (
              <div
                key={r.userId ?? i}
                className="flex items-center gap-3 rounded-2xl border border-border bg-white/[0.02] px-4 py-3 transition-colors hover:border-primary/25 hover:bg-white/[0.04]"
              >
                <RankBadge rank={r.rank} />
                <span className="truncate text-sm">{r.isAnonymous ? "Anonymous" : r.username}</span>
                <span className="ml-auto font-mono text-sm text-fire">{r.weight.toFixed(2)} wt</span>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link href="/leaderboard">
              <GhostButton size="lg" className="group">
                View full leaderboard
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </GhostButton>
            </Link>
          </div>
        </motion.div>

        <motion.div style={{ scale: ringScale, opacity: ringOpacity }} className="flex justify-center">
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 -z-10 animate-pulse rounded-full bg-primary/10 blur-3xl" />
            <div className="relative grid place-items-center rounded-full border border-border bg-white/[0.02] p-10 backdrop-blur-sm">
              <RoundProgressRing size={300} round={round} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const FALLBACK: RoundEntry[] = [
  { rank: 1, userId: "f1", username: "ember.sol", weight: 184.5, isAnonymous: false },
  { rank: 2, userId: "f2", username: "Anonymous", weight: 142.0, isAnonymous: true },
  { rank: 3, userId: "f3", username: "phoenix", weight: 98.25, isAnonymous: false },
  { rank: 4, userId: "f4", username: "molten", weight: 71.4, isAnonymous: false },
];
