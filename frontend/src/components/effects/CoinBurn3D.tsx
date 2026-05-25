"use client";

import { useRef, useEffect, useCallback } from "react";
import styles from "./coinburn.module.css";

// ---- Types ----
interface Props {
  currency?: "USDC" | "SOL";
  amount?: number;
  size?: number;
  phase: "idle" | "burning" | "done";
  onClick?: () => void;
  disabled?: boolean;
}

// ---- Fire particle type ----
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const FIRE_COLORS = ["#FF4D00", "#FFB800", "#FF6B00", "#FF2200", "#FF8800"];

// ---- Component ----
export default function CoinBurn3D({
  currency = "USDC",
  amount,
  size = 200,
  phase,
  onClick,
  disabled = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const canvasSize = size * 3;

  // ---- Canvas fire animation ----
  const spawnParticles = useCallback(
    (_canvas: HTMLCanvasElement) => {
      const coinCenterX = canvasSize / 2;
      // Coin top edge: canvas is centered, coin occupies middle third
      const coinTopY = (canvasSize - size) / 2;

      for (let i = 0; i < 10; i++) {
        const spread = size * 0.45;
        particlesRef.current.push({
          x: coinCenterX + (Math.random() - 0.5) * spread,
          y: coinTopY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 2.5,
          vy: -(Math.random() * 3.5 + 1.5),
          life: Math.floor(Math.random() * 20 + 40),
          maxLife: Math.floor(Math.random() * 20 + 40),
          size: Math.random() * 6 + 3,
          color: FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)],
        });
      }
    },
    [canvasSize, size]
  );

  const drawParticles = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, canvasSize, canvasSize);

      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      for (const p of particlesRef.current) {
        const alpha = p.life / p.maxLife;

        // Outer glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        grad.addColorStop(0, p.color + Math.round(alpha * 255).toString(16).padStart(2, "0"));
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(alpha * 220).toString(16).padStart(2, "0");
        ctx.fill();

        // Update physics
        p.x += p.vx + (Math.random() - 0.5) * 0.5;
        p.y += p.vy;
        p.vy -= 0.04; // slight upward acceleration
        p.vx *= 0.98;
        p.size *= 0.97;
        p.life--;
      }
    },
    [canvasSize]
  );

  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      spawnParticles(canvas);
      drawParticles(ctx);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [spawnParticles, drawParticles]);

  const stopAnimation = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvasSize, canvasSize);
    }
    particlesRef.current = [];
  }, [canvasSize]);

  useEffect(() => {
    if (phase === "burning") {
      startAnimation();
    } else {
      stopAnimation();
    }
    return () => stopAnimation();
  }, [phase, startAnimation, stopAnimation]);

  // ---- Coin phase class ----
  const coinPhaseClass =
    disabled
      ? styles["coin--disabled"]
      : phase === "burning"
      ? styles["coin--burning"]
      : phase === "done"
      ? styles["coin--done"]
      : styles["coin--idle"];

  // ---- Face classes ----
  const frontFaceClass =
    currency === "USDC"
      ? `${styles.coinFront} ${styles.usdcFront}`
      : `${styles.coinFront} ${styles.solFront}`;

  const backFaceClass =
    currency === "USDC"
      ? `${styles.coinBack} ${styles.usdcBack}`
      : `${styles.coinBack} ${styles.solBack}`;

  // ---- Symbol ----
  const symbolChar = currency === "USDC" ? "$" : "◎";
  const symbolSize = size * 0.32;
  const currencySize = size * 0.12;
  const amountSize = size * 0.10;

  // ---- Canvas positioning ----
  const canvasTop = -((canvasSize - size) / 2);

  return (
    <div
      className={`${styles.coinContainer}${disabled ? " " + styles.disabled : ""}`}
      style={{ width: size, height: size }}
      onClick={disabled ? undefined : onClick}
    >
      {/* Aura glow behind coin */}
      <div className={styles.coinAura} />

      {/* Perspective wrapper */}
      <div
        className={`${styles.coinWrapper}${disabled ? " " + styles.disabled : ""}`}
        style={{ width: size, height: size }}
      >
        {/* The 3D coin */}
        <div
          className={`${styles.coin} ${coinPhaseClass}`}
          style={{ width: size, height: size }}
        >
          {/* Front face */}
          <div className={frontFaceClass}>
            <span
              className={styles.coinSymbol}
              style={{ fontSize: symbolSize }}
            >
              {symbolChar}
            </span>
            <span
              className={styles.coinCurrency}
              style={{ fontSize: currencySize }}
            >
              {currency}
            </span>
            {amount != null && amount > 0 && (
              <span
                className={styles.coinAmount}
                style={{ fontSize: amountSize }}
              >
                ${amount.toFixed(2)}
              </span>
            )}
          </div>

          {/* Back face */}
          <div className={backFaceClass}>
            <div className={styles.coinBackContent}>
              <span
                className={styles.coinSymbol}
                style={{ fontSize: symbolSize * 0.8, opacity: 0.6 }}
              >
                {symbolChar}
              </span>
            </div>
          </div>
        </div>

        {/* Fire canvas — only mounted during burning, but always present for smooth transition */}
        <canvas
          ref={canvasRef}
          className={styles.fireCanvas}
          width={canvasSize}
          height={canvasSize}
          style={{
            width: canvasSize,
            height: canvasSize,
            top: canvasTop,
            opacity: phase === "burning" ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
