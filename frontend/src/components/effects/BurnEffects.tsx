"use client";

import { useEffect, useRef } from "react";
import styles from "./effects.module.css";

// ============================================================
// WIN: Fire Explosion with Golden Particles
// ============================================================
export function FireExplosion({ onComplete }: { onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      size: number; alpha: number;
      color: string; decay: number;
      type: "spark" | "shard" | "ring";
    }

    const particles: Particle[] = [];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const colors = ["#FFD700", "#FFA500", "#FF6347", "#FF4500", "#FFEC8B", "#fff"];

    // Generate explosion particles
    for (let i = 0; i < 120; i++) {
      const angle = (Math.PI * 2 * i) / 120;
      const speed = 3 + Math.random() * 8;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 5,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        decay: 0.008 + Math.random() * 0.012,
        type: "spark",
      });
    }

    // Golden shards
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 6 + Math.random() * 10,
        alpha: 1,
        color: colors[Math.floor(Math.random() * 2)],
        decay: 0.006 + Math.random() * 0.008,
        type: "shard",
      });
    }

    // Expanding rings
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: cx, y: cy,
        vx: 0, vy: 0,
        size: 10 + i * 30,
        alpha: 0.6,
        color: "#FFD700",
        decay: 0.015,
        type: "ring",
      });
    }

    let frame = 0;
    const maxFrames = 180;

    function animate() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      for (const p of particles) {
        if (p.alpha <= 0) continue;

        ctx.globalAlpha = p.alpha;

        if (p.type === "ring") {
          p.size += 4;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.type === "shard") {
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(frame * 0.1);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08;
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          p.size *= 0.99;
        }

        p.alpha -= p.decay;
      }

      frame++;
      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    }

    // Screen shake
    document.body.classList.add(styles.screenShake);
    setTimeout(() => document.body.classList.remove(styles.screenShake), 500);

    animate();
  }, [onComplete]);

  return (
    <div className={styles.effectOverlay}>
      <canvas ref={canvasRef} className={styles.effectCanvas} />
      <div className={styles.winGlow} />
    </div>
  );
}

// ============================================================
// LOSE: Falling Ash Particles with Fading Fire
// ============================================================
export function AshFall({ onComplete }: { onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface AshParticle {
      x: number; y: number;
      size: number; alpha: number;
      speed: number; wobble: number;
      wobbleSpeed: number; rotation: number;
      color: string;
    }

    const particles: AshParticle[] = [];
    const colors = ["#4a4a4a", "#6b6b6b", "#8b8b8b", "#3d3d3d", "#5c4033", "#8B4513"];

    // Generate ash particles across the top
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        size: 2 + Math.random() * 6,
        alpha: 0.4 + Math.random() * 0.5,
        speed: 0.5 + Math.random() * 2,
        wobble: 0,
        wobbleSpeed: 0.02 + Math.random() * 0.04,
        rotation: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // Ember particles (fading fire)
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 300,
        y: canvas.height / 2 + (Math.random() - 0.5) * 100,
        size: 3 + Math.random() * 4,
        alpha: 0.8,
        speed: -1 - Math.random() * 2,
        wobble: 0,
        wobbleSpeed: 0.05,
        rotation: 0,
        color: Math.random() > 0.5 ? "#e67e22" : "#e74c3c",
      });
    }

    let frame = 0;
    const maxFrames = 200;

    function animate() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      // Dark vignette overlay
      const gradient = ctx.createRadialGradient(
        canvas!.width / 2, canvas!.height / 2, 100,
        canvas!.width / 2, canvas!.height / 2, canvas!.width / 1.5
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${Math.min(frame / 80, 0.3)})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas!.width, canvas!.height);

      for (const p of particles) {
        if (p.alpha <= 0) continue;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        // Irregular ash shape
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Move
        p.wobble += p.wobbleSpeed;
        p.x += Math.sin(p.wobble) * 1.5;
        p.y += p.speed;
        p.rotation += 0.02;

        // Fade embers faster
        if (p.color.startsWith("#e")) {
          p.alpha -= 0.004;
          p.y += p.speed;
        }

        // Reset ash that falls off screen
        if (p.y > canvas!.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas!.width;
        }
      }

      frame++;
      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    }

    animate();
  }, [onComplete]);

  return (
    <div className={styles.effectOverlay}>
      <canvas ref={canvasRef} className={styles.effectCanvas} />
    </div>
  );
}
