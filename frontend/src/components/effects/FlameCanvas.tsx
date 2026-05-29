"use client";

import { useEffect, useRef } from "react";

/**
 * Canvas-based flame + ember particle system.
 * Renders a continuous fire animation tinted in the Ashnance fire palette.
 * Self-contained — handles its own animation frame loop and resize.
 */
export function FlameCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let rafId = 0;
    let particles: Particle[] = [];

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;          // radius
      life: number;       // ms remaining
      maxLife: number;
      hue: number;        // 10..50 (red→orange→yellow)
      kind: "spark" | "ember";
    };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.floor(rect.width * dpr);
      canvas!.height = Math.floor(rect.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn() {
      const baseX = width / 2 + (Math.random() - 0.5) * width * 0.35;
      const isEmber = Math.random() < 0.35;
      particles.push({
        x: baseX,
        y: height + 20,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.6 - Math.random() * 1.2,
        r: isEmber ? 1 + Math.random() * 1.5 : 3 + Math.random() * 6,
        life: 1800 + Math.random() * 1400,
        maxLife: 1800 + Math.random() * 1400,
        hue: 10 + Math.random() * 40,
        kind: isEmber ? "ember" : "spark",
      });
    }

    let last = performance.now();
    function tick(now: number) {
      const dt = Math.min(now - last, 50);
      last = now;

      // Spawn rate
      const target = Math.floor(width / 12);
      while (particles.length < target) spawn();

      // Fade trail effect — slight clear with composite
      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = "rgba(8,8,10,0.18)";
      ctx!.fillRect(0, 0, width, height);

      ctx!.globalCompositeOperation = "lighter";
      const next: Particle[] = [];
      for (const p of particles) {
        p.life -= dt;
        if (p.life <= 0) continue;

        // Buoyancy + horizontal wobble
        p.vy -= 0.0008 * dt;
        p.vx += (Math.random() - 0.5) * 0.02;
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.r *= 0.997;

        const t = p.life / p.maxLife;          // 1 → 0 over lifetime
        const alpha = Math.pow(t, 1.5) * (p.kind === "ember" ? 0.9 : 0.55);
        const hue = p.hue - (1 - t) * 8;       // shift to yellow as it cools (visually)

        const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grad.addColorStop(0, `hsla(${hue}, 100%, 65%, ${alpha})`);
        grad.addColorStop(0.4, `hsla(${hue - 5}, 100%, 50%, ${alpha * 0.6})`);
        grad.addColorStop(1, `hsla(${hue}, 100%, 35%, 0)`);

        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx!.fill();

        if (p.y > -20 && p.x > -20 && p.x < width + 20) next.push(p);
      }
      particles = next;

      rafId = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  );
}
