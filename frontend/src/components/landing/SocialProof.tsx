"use client";

// Honest "by the numbers" band — every figure is derived from the live round
// the page already fetched, so nothing here is fabricated. Falls back to a
// tasteful resting state before data lands.
import { Counter } from "@/components/motion/Counter";
import { Stagger, StaggerItem, Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "./Parts";
import type { Round } from "@/lib/types";

export function SocialProof({ round }: { round: Round | null }) {
  const pool = round?.prizePool ?? 0;
  const target = round?.prizePoolTarget ?? 500;
  const pct = target > 0 ? Math.min(100, (pool / target) * 100) : 0;
  const burners = round?.leaderboard?.length ?? 0;
  const roundNo = round?.number ?? 0;

  const stats = [
    { value: pool, prefix: "$", decimals: 0, label: "In the prize pool" },
    { value: roundNo, prefix: "#", decimals: 0, label: "Current round" },
    { value: burners, decimals: 0, label: "Burners competing" },
    { value: pct, decimals: 1, suffix: "%", label: "Pool filled" },
  ];

  return (
    <section className="relative mx-auto max-w-6xl px-5 py-20">
      <div className="glass-card relative overflow-hidden rounded-[32px] p-8 sm:p-12">
        <div className="pointer-events-none absolute -left-20 top-0 size-72 rounded-full bg-fire/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 size-72 rounded-full bg-gold/10 blur-3xl" />

        <div className="relative text-center">
          <Reveal><Eyebrow accent="success">Live on Solana right now</Eyebrow></Reveal>
        </div>

        <Stagger className="relative mt-10 grid grid-cols-2 gap-8 lg:grid-cols-4" stagger={0.1}>
          {stats.map((s) => (
            <StaggerItem key={s.label} className="text-center">
              <div className="font-mono text-4xl font-bold tracking-tight text-fire sm:text-5xl">
                <Counter to={s.value} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
              </div>
              <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground sm:text-sm">
                {s.label}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
