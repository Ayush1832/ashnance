"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedWords } from "@/components/motion/AnimatedText";
import { Reveal } from "@/components/motion/Reveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { AuroraBackground } from "@/components/effects/AuroraBackground";
import { ParticleField } from "@/components/effects/ParticleField";
import { FireButton, GhostButton } from "@/components/ashnance/primitives";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden px-5 py-32 sm:py-44">
      <AuroraBackground intensity={1.3} />
      <ParticleField count={64} className="opacity-80" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h2 className="font-display text-[clamp(2.5rem,7vw,5rem)] font-extrabold leading-[0.95] tracking-tight">
          <span className="block">
            <AnimatedWords text="Ready to take" inViewTrigger delay={0.05} />
          </span>
          <span className="block text-molten text-glow">
            <AnimatedWords text="the whole pool?" inViewTrigger delay={0.18} />
          </span>
        </h2>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-7 max-w-xl text-lg text-muted-foreground">
            Deposit, burn, and climb. The next round is filling right now — and one wallet
            is going to take everything.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Magnetic strength={0.45}>
              <Link href="/register">
                <FireButton size="xl" className="group">
                  Start burning
                  <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
                </FireButton>
              </Link>
            </Magnetic>
            <Magnetic strength={0.3}>
              <Link href="/login">
                <GhostButton size="lg">I already have an account</GhostButton>
              </Link>
            </Magnetic>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
