"use client";

// Canvas ember field — soft glowing motes rising with a little lateral sway.
// Performance-conscious: DPR capped at 1.5, modest particle count, pauses when
// the tab is hidden, and renders a single static frame under reduced-motion.
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Particle {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  life: number;
  ttl: number;
  o: number;
}

export function ParticleField({
  className,
  count = 46,
  color = "255,150,70",
}: {
  className?: string;
  count?: number;
  color?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    const parts: Particle[] = [];

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const spawn = (initial: boolean): Particle => ({
      x: rnd(0, w || 1),
      y: initial ? rnd(0, h || 1) : (h || 1) + 12,
      r: rnd(0.6, 2.2),
      vy: rnd(10, 30),
      vx: rnd(-7, 7),
      life: 0,
      ttl: rnd(6, 13),
      o: rnd(0.18, 0.65),
    });

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      w = rect?.width ?? window.innerWidth;
      h = rect?.height ?? window.innerHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const init = () => {
      parts.length = 0;
      for (let i = 0; i < count; i++) parts.push(spawn(true));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        const k = p.life / p.ttl;
        const fade = k < 0.12 ? k / 0.12 : k > 0.7 ? Math.max(0, (1 - k) / 0.3) : 1;
        const rad = p.r * 4;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        g.addColorStop(0, `rgba(${color},${(p.o * fade).toFixed(3)})`);
        g.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const frame = (ts: number) => {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts;
      for (const p of parts) {
        p.life += dt;
        p.y -= p.vy * dt;
        p.x += p.vx * dt + Math.sin(p.life * 1.4) * 0.25;
        if (p.y < -14 || p.life > p.ttl) Object.assign(p, spawn(false));
      }
      draw();
      raf = requestAnimationFrame(frame);
    };

    resize();
    init();
    if (reduce) draw();
    else raf = requestAnimationFrame(frame);

    const onResize = () => {
      resize();
      init();
    };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        last = 0;
      } else if (!reduce) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [count, color]);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} />;
}
