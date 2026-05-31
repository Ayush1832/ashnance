"use client";

// Global smooth-scroll provider. Lenis drives the real window scroll (so
// Framer's useScroll + GSAP ScrollTrigger both read correct positions), and a
// single GSAP ticker drives Lenis's RAF so motion stays perfectly in sync —
// no double RAF loop, no jank. Reduced-motion users fall back to native scroll.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const LenisContext = createContext<Lenis | null>(null);

/** Access the live Lenis instance (null on first render / reduced-motion). */
export const useSmoothScroll = () => useContext(LenisContext);

export function SmoothScroll({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return; // native scroll — no Lenis, no GSAP ticker

    gsap.registerPlugin(ScrollTrigger);

    const l = new Lenis({
      duration: 1.1,
      // expo-out — long, weighted glide that settles softly
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });
    setLenis(l);

    l.on("scroll", ScrollTrigger.update);

    const onTick = (time: number) => l.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      l.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
