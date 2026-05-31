"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Counter } from "@/components/motion/Counter";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "./Parts";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

const SPLITS = [
  { pct: 40, label: "Prize pool", desc: "Funds the winner payout every round.", bar: "bg-fire", text: "text-fire" },
  { pct: 40, label: "Platform", desc: "Powers the protocol and the profit pool.", bar: "bg-[oklch(0.34_0.04_285)]", text: "text-foreground" },
  { pct: 20, label: "Referral", desc: "Pays commissions to those who bring new burners.", bar: "bg-[oklch(0.55_0.18_300)]", text: "text-[oklch(0.74_0.16_300)]" },
];

export function PoolMechanics() {
  const barRef = useRef<HTMLDivElement>(null);
  const inView = useInView(barRef, { once: true, margin: "0px 0px -20% 0px" });

  return (
    <section className="relative mx-auto max-w-5xl px-5 py-28 sm:py-32">
      <div className="text-center">
        <Reveal><Eyebrow accent="fire">Pool mechanics</Eyebrow></Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Where every dollar goes
          </h2>
        </Reveal>
        <Reveal delay={0.14}>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Transparent by design. Each burn splits three ways — no surprises, all on-chain.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <div className="glass-card mt-12 rounded-3xl p-6 sm:p-9">
          <div ref={barRef} className="flex h-14 overflow-hidden rounded-2xl">
            {SPLITS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ width: 0 }}
                animate={inView ? { width: `${s.pct}%` } : { width: 0 }}
                transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.2 + i * 0.15 }}
                className={cn(
                  "grid place-items-center text-xs font-semibold text-background",
                  s.bar,
                  i < SPLITS.length - 1 && "border-r border-background/40",
                )}
              >
                <span className="px-1">{s.pct}%</span>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {SPLITS.map((s) => (
              <div key={s.label}>
                <div className={cn("font-mono text-4xl font-bold", s.text)}>
                  <Counter to={s.pct} suffix="%" />
                </div>
                <div className="mt-2 text-sm font-semibold">{s.label}</div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
