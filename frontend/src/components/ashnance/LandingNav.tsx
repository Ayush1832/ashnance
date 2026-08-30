"use client";

// Floating, scroll-aware navbar. Condenses into a glass pill once you leave the
// hero, hides on scroll-down / reveals on scroll-up, and routes in-page links
// through Lenis for inertial anchor scrolling. CTA is magnetic.
import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { Magnetic } from "@/components/motion/Magnetic";
import { useSmoothScroll } from "@/components/motion/SmoothScroll";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { label: "How it works", id: "how" },
  { label: "ASH", id: "ash" },
  { label: "VIP", id: "vip" },
  { label: "Winners", id: "winners" },
];

export function LandingNav() {
  const lenis = useSmoothScroll();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 24);
    const prev = lastY.current;
    setHidden(y > prev && y > 260 && !open);
    lastY.current = y;
  });

  const go = (id: string) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -90 });
    else el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.header
      initial={{ y: -110, opacity: 0 }}
      animate={{ y: hidden ? -110 : 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="fixed inset-x-0 top-0 z-[60] flex flex-col items-center px-4 pt-4"
    >
      <nav
        className={cn(
          "flex w-full max-w-5xl items-center justify-between gap-4 rounded-full px-3 py-2.5 transition-all duration-500",
          scrolled ? "glass-card !rounded-full" : "border border-transparent",
        )}
      >
        <Logo size="sm" className="pl-1.5" />

        <div className="hidden items-center gap-0.5 md:flex">
          {SECTIONS.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              {l.label}
            </button>
          ))}
          <Link
            href="/leaderboard"
            className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            Leaderboard
          </Link>
          <Link
            href="/whitepaper"
            className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            Whitepaper
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden px-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Log in
          </Link>
          <Magnetic className="hidden sm:block" strength={0.4}>
            <Link
              href="/register"
              className="group inline-flex items-center gap-1.5 rounded-full bg-fire px-4 py-2 text-sm font-semibold text-background transition-shadow duration-300 hover:glow-fire"
            >
              Start burning
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Magnetic>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="grid size-9 place-items-center rounded-full glass text-foreground md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="glass-card mt-2 w-full max-w-5xl overflow-hidden rounded-3xl p-2 md:hidden"
          >
            {SECTIONS.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                {l.label}
              </button>
            ))}
            <Link
              href="/leaderboard"
              onClick={() => setOpen(false)}
              className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              Leaderboard
            </Link>
            <Link
              href="/whitepaper"
              onClick={() => setOpen(false)}
              className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              Whitepaper
            </Link>
            <div className="mt-1 grid grid-cols-2 gap-2 p-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border px-4 py-2.5 text-center text-sm text-foreground transition-colors hover:bg-white/5"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="rounded-full bg-fire px-4 py-2.5 text-center text-sm font-semibold text-background"
              >
                Start burning
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
