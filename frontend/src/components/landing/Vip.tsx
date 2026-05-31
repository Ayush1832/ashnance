"use client";

import Link from "next/link";
import { Check, Crown, Sparkles } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { TiltCard } from "@/components/motion/TiltCard";
import { FireButton } from "@/components/ashnance/primitives";
import { Eyebrow } from "./Parts";

const PERKS = [
  "+0.50 weight on every single burn",
  "+20% ASH rewards on every burn",
  "Gold VIP badge on your profile & the leaderboard",
];

export function Vip() {
  return (
    <section id="vip" className="relative mx-auto max-w-3xl px-5 py-28 sm:py-32">
      <div className="mb-12 text-center">
        <Reveal><Eyebrow accent="gold">Holy Fire VIP</Eyebrow></Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Burn with an <span className="text-gold">edge</span>.
          </h2>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <div className="relative [perspective:1400px]">
          {/* gold halo */}
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] bg-[radial-gradient(ellipse_at_center,rgba(255,184,0,0.16),transparent_70%)] blur-2xl" />
          <TiltCard max={5} className="glass-card border-sheen relative overflow-hidden rounded-[32px] p-8 sm:p-12">
            <div className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold">
              <Sparkles className="size-3" /> Recommended
            </div>

            <div className="inline-flex items-center gap-2.5 text-gold">
              <span className="grid size-11 place-items-center rounded-2xl bg-gold/10 ring-1 ring-gold/30">
                <Crown className="size-5" />
              </span>
              <span className="font-display text-2xl font-semibold">Holy Fire</span>
            </div>

            <div className="mt-7 flex items-end gap-2">
              <span className="font-mono text-6xl font-bold tracking-tight">$24.99</span>
              <span className="mb-2 text-muted-foreground">/ 30 days</span>
            </div>

            <ul className="mt-8 space-y-3.5">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[15px]">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span className="text-foreground/90">{p}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Magnetic strength={0.4}>
                <Link href="/subscribe">
                  <FireButton size="lg" className="w-full sm:w-auto">Upgrade to Holy Fire</FireButton>
                </Link>
              </Magnetic>
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              Spark and Active Ash tiers are also available —{" "}
              <Link href="/subscribe" className="text-foreground underline-offset-4 hover:underline">
                compare all tiers
              </Link>.
            </p>
          </TiltCard>
        </div>
      </Reveal>
    </section>
  );
}
