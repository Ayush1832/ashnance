"use client";

import { Flame, Send, Sprout, Zap, type LucideIcon } from "lucide-react";
import { Stagger, StaggerItem, Reveal } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { Eyebrow } from "./Parts";

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  { icon: Flame, title: "Earn", body: "Every burn mints ASH. Emissions halve every 100M tokens, so early burners earn the most." },
  { icon: Zap, title: "Boost", body: "Spend 1,000 ASH for a +0.50 weight bonus that compounds your climb for a full hour." },
  { icon: Sprout, title: "Stake", body: "Lock ASH into Ember, Flame, or Inferno pools for up to 30% APY in passive yield." },
  { icon: Send, title: "Claim", body: "Transfer your ASH to any Solana wallet, anytime. It's a real token — fully yours." },
];

export function AshSection() {
  return (
    <section id="ash" className="relative mx-auto max-w-6xl px-5 py-28 sm:py-32">
      <div className="mb-14 text-center">
        <Reveal><Eyebrow accent="ash">ASH Token</Eyebrow></Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Earn it. Spend it. <span className="text-ash">Grow it.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.14}>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            ASH is the reward layer that turns every burn into long-term upside — a token that
            works whether you win the round or not.
          </p>
        </Reveal>
      </div>

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
        {FEATURES.map((f) => (
          <StaggerItem key={f.title}>
            <TiltCard max={9} className="glass-card card-glow group relative h-full overflow-hidden rounded-3xl p-7">
              <div className="grid size-12 place-items-center rounded-2xl border border-border bg-white/[0.03] text-ash transition-colors duration-500 group-hover:border-ash/30 group-hover:text-foreground">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </TiltCard>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
