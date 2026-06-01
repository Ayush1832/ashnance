"use client";

// Sticky scrollytelling. The left rail pins while the right step-cards scroll;
// whichever card sits at viewport center becomes "active", lighting up the rail
// and its number. On mobile the left rail un-sticks into a normal stacked flow.
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Flame, Trophy, Wallet, type LucideIcon } from "lucide-react";
import { Eyebrow } from "./Parts";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Step {
  n: string;
  icon: LucideIcon;
  title: string;
  body: string;
  detail: string;
}

const STEPS: Step[] = [
  {
    n: "01",
    icon: Wallet,
    title: "Deposit USDC",
    body: "Fund your account in seconds. $1 minimum, no lockups.",
    detail: "Your balance stays yours — withdraw to any Solana wallet anytime, gated only by 2FA.",
  },
  {
    n: "02",
    icon: Flame,
    title: "Burn & earn weight",
    body: "Every burn spends USDC and mints WEIGHT — your live rank score — plus ASH.",
    detail: "Bigger burns, VIP status, active referrals, and ASH boosts all multiply the weight you earn.",
  },
  {
    n: "03",
    icon: Trophy,
    title: "Hold #1 when it fills",
    body: "When the pool hits target, the #1 weight holder wins the entire prize.",
    detail: "Payout settles on-chain. The winner resets to zero, everyone else decays 10%, and the next round opens instantly.",
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const onActive = useCallback((i: number) => setActive(i), []);

  return (
    <section id="how" className="relative mx-auto max-w-6xl px-5 py-28 sm:py-36">
      <div className="grid gap-12 md:grid-cols-2 md:gap-16">
        {/* sticky rail */}
        <div className="md:sticky md:top-32 md:h-fit md:self-start">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Three steps.
            <br />
            <span className="text-fire">One winner.</span>
          </h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            No bidding wars, no hidden mechanics. Deposit, burn to climb, and outlast the field
            to take the whole pool.
          </p>

          <div className="mt-10 hidden flex-col gap-1 md:flex">
            {STEPS.map((s, i) => (
              <button
                key={s.n}
                onClick={() => setActive(i)}
                className="group flex items-center gap-4 py-2 text-left"
              >
                <span className="relative flex h-10 w-px justify-center">
                  <span className="absolute inset-0 bg-border" />
                  <motion.span
                    className="absolute inset-0 bg-fire"
                    initial={false}
                    animate={{ scaleY: active === i ? 1 : 0 }}
                    style={{ transformOrigin: "top" }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                  />
                </span>
                <span
                  className={cn(
                    "font-mono text-sm transition-colors duration-300",
                    active === i ? "text-fire" : "text-muted-foreground/50",
                  )}
                >
                  {s.n}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium transition-colors duration-300",
                    active === i ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {s.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* scrolling cards */}
        <div className="flex flex-col gap-6 sm:gap-8">
          {STEPS.map((s, i) => (
            <StepCard key={s.n} step={s} index={i} active={active === i} onActive={onActive} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  index,
  active,
  onActive,
}: {
  step: Step;
  index: number;
  active: boolean;
  onActive: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px", amount: 0.2 });

  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      transition={{ duration: 0.8, ease: EASE_OUT }}
      className={cn(
        "glass-card relative overflow-hidden rounded-3xl p-7 transition-all duration-500 sm:p-9",
        active ? "border-primary/30 shadow-[var(--shadow-fire)]" : "shadow-[var(--shadow-float)]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 size-40 rounded-full blur-3xl transition-opacity duration-500",
          active ? "bg-primary/20 opacity-100" : "opacity-0",
        )}
      />
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "grid size-14 place-items-center rounded-2xl border transition-colors duration-500",
            active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-white/[0.02] text-muted-foreground",
          )}
        >
          <Icon className="size-6" />
        </div>
        <span className="font-mono text-5xl font-bold text-white/[0.06]">{step.n}</span>
      </div>
      <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight">{step.title}</h3>
      <p className="mt-2.5 text-[15px] leading-relaxed text-foreground/80">{step.body}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
    </motion.div>
  );
}
