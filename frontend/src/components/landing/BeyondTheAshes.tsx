"use client";

import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { Eyebrow } from "./Parts";

interface Step {
  num: string;
  emoji: string;
  title: string;
  body: string;
  glow: string; // ambient glow tint — all within the fire/gold family
}

const STEPS: Step[] = [
  { num: "01", emoji: "🔥", title: "Burn", body: "Enter the ritual.", glow: "rgba(255,69,0,0.22)" },
  { num: "02", emoji: "⚡", title: "Discover", body: "Reveal your outcome instantly.", glow: "rgba(255,150,30,0.20)" },
  { num: "03", emoji: "🏆", title: "Rise", body: "Collect rewards, badges, and legendary wins.", glow: "rgba(255,184,0,0.22)" },
];

export function BeyondTheAshes() {
  return (
    <section className="relative mx-auto max-w-6xl px-5 py-28 sm:py-32">
      <div className="mb-14 text-center">
        <Reveal><Eyebrow accent="fire">The ritual</Eyebrow></Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            What awaits beyond <span className="text-fire">the ashes</span>
          </h2>
        </Reveal>
        <Reveal delay={0.14}>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Step into the ritual. Every burn unlocks a new possibility.
          </p>
        </Reveal>
      </div>

      <Stagger className="grid gap-5 md:grid-cols-3" stagger={0.12}>
        {STEPS.map((s) => (
          <StaggerItem key={s.title}>
            <TiltCard max={8} className="glass-card card-glow group relative h-full overflow-hidden rounded-3xl p-8">
              {/* ambient glow that intensifies on hover */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full opacity-50 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle, ${s.glow}, transparent 70%)` }}
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-500 group-hover:scale-110">
                    {s.emoji}
                  </span>
                  <span className="font-mono text-5xl font-bold text-white/[0.06] transition-colors duration-500 group-hover:text-white/[0.1]">
                    {s.num}
                  </span>
                </div>
                <h3 className="mt-7 font-display text-2xl font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
              {/* bottom sheen that lights up on hover */}
              <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-transparent to-transparent transition-all duration-500 group-hover:via-primary/40" />
            </TiltCard>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
