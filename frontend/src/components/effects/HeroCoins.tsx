"use client";

import { useEffect, useRef } from "react";
import styles from "./herocoins.module.css";

interface FireballConfig {
  currency: "USDC" | "SOL";
  size: number;
  top: string;
  left?: string;
  right?: string;
  bobAnimation: string;
  bobDuration: string;
  bobDelay: string;
  showOnMobile?: boolean;
}

const FIREBALLS: FireballConfig[] = [
  { currency: "USDC", size: 90,  top: "8%",  left: "5%",  bobAnimation: "heroBob0", bobDuration: "5.8s", bobDelay: "0s",    showOnMobile: false },
  { currency: "SOL",  size: 66,  top: "60%", left: "8%",  bobAnimation: "heroBob1", bobDuration: "7.2s", bobDelay: "-1.5s", showOnMobile: true  },
  { currency: "USDC", size: 100, top: "10%", right: "6%", bobAnimation: "heroBob2", bobDuration: "6.5s", bobDelay: "-2.8s", showOnMobile: false },
  { currency: "SOL",  size: 74,  top: "62%", right: "5%", bobAnimation: "heroBob3", bobDuration: "8.1s", bobDelay: "-0.7s", showOnMobile: true  },
  { currency: "USDC", size: 78,  top: "38%", left: "2%",  bobAnimation: "heroBob4", bobDuration: "6.9s", bobDelay: "-3.2s", showOnMobile: false },
];

// Canvas simulation dimensions (small = fast, scaled up by CSS)
const CW = 64;
const CH = 96; // taller than wide so flames rise above sphere
const SPHERE_CX = CW * 0.5;
const SPHERE_CY = CH * 0.72;
const SPHERE_R  = CW * 0.44;

// Build RGBA palette (intensity 0-255 → color)
// Stored as Uint32 in little-endian ABGR format for ImageData.
function buildPalette(type: "USDC" | "SOL"): Uint32Array {
  const p = new Uint32Array(256);
  for (let i = 1; i < 256; i++) {
    const t = i / 255;
    let r = 0, g = 0, b = 0;
    // alpha: transparent at low end, opaque quickly
    const a = Math.min(255, i < 24 ? i * 9 : 230 + Math.round(t * 25));

    if (type === "USDC") {
      // Classic fire: black → red → orange → yellow → white
      if (t < 0.33) {
        r = Math.round((t / 0.33) * 255); g = 0; b = 0;
      } else if (t < 0.66) {
        const s = (t - 0.33) / 0.33;
        r = 255; g = Math.round(s * 185); b = 0;
      } else {
        const s = (t - 0.66) / 0.34;
        r = 255; g = Math.round(185 + s * 70); b = Math.round(s * 255);
      }
    } else {
      // SOL plasma: black → indigo → violet → bright purple → pale lavender
      if (t < 0.33) {
        const s = t / 0.33;
        r = Math.round(s * 80); g = 0; b = Math.round(s * 210);
      } else if (t < 0.66) {
        const s = (t - 0.33) / 0.33;
        r = Math.round(80 + s * 170); g = Math.round(s * 55); b = Math.min(255, Math.round(210 + s * 45));
      } else {
        const s = (t - 0.66) / 0.34;
        r = 255; g = Math.round(55 + s * 165); b = 255;
      }
    }
    p[i] = ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
  }
  return p;
}

// Pre-compute sphere masks (shared for all fireballs — same CW/CH/params)
const _inCore: Uint8Array = (() => {
  const m = new Uint8Array(CW * CH);
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const d = Math.sqrt((x - SPHERE_CX) ** 2 + (y - SPHERE_CY) ** 2);
      if (d < SPHERE_R * 0.86) m[y * CW + x] = 1;
    }
  return m;
})();

const _onRim: Uint8Array = (() => {
  const m = new Uint8Array(CW * CH);
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const d = Math.sqrt((x - SPHERE_CX) ** 2 + (y - SPHERE_CY) ** 2);
      if (d >= SPHERE_R * 0.86 && d < SPHERE_R + 2) m[y * CW + x] = 1;
    }
  return m;
})();

function FireCanvas({ currency, displaySize }: { currency: "USDC" | "SOL"; displaySize: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = CW;
    canvas.height = CH;

    const pal  = buildPalette(currency);
    const grid = new Uint8Array(CW * CH);
    const img  = ctx.createImageData(CW, CH);
    const px32 = new Uint32Array(img.data.buffer);

    // Seed sphere hot to avoid cold startup
    for (let i = 0; i < CW * CH; i++) {
      if (_inCore[i] || _onRim[i])
        grid[i] = 200 + Math.floor(Math.random() * 55);
    }

    let rafId = 0;
    const tick = () => {
      // Doom fire: each pixel receives a decayed, slightly drifted value from the row below
      for (let y = 1; y < CH; y++) {
        for (let x = 0; x < CW; x++) {
          const decay = Math.floor(Math.random() * 3);      // 0-2
          const src   = grid[y * CW + x];
          const dst   = src > decay ? src - decay : 0;
          const nx    = Math.max(0, Math.min(CW - 1, x + Math.floor(Math.random() * 3) - 1));
          grid[(y - 1) * CW + nx] = dst;
        }
      }

      // Hold sphere core and rim hot (fire source)
      for (let i = 0; i < CW * CH; i++) {
        if (_inCore[i]) {
          if (grid[i] < 178) grid[i] = 178 + Math.floor(Math.random() * 77);
        } else if (_onRim[i]) {
          grid[i] = 228 + Math.floor(Math.random() * 27);
        }
      }

      // Render pixels
      for (let i = 0; i < CW * CH; i++) px32[i] = pal[grid[i]];
      ctx.putImageData(img, 0, 0);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [currency]);

  const displayH = Math.round(displaySize * (CH / CW));
  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: displaySize, height: displayH }}
    />
  );
}

function Fireball({ ball }: { ball: FireballConfig }) {
  const isUSDC    = ball.currency === "USDC";
  const displayH  = Math.round(ball.size * (CH / CW));
  // Sphere centre in CSS pixels within the canvas element
  const labelTop  = Math.round(displayH * (SPHERE_CY / CH) - ball.size * 0.2);

  const posStyle: React.CSSProperties = {
    position: "absolute",
    top: ball.top,
    ...(ball.left  ? { left: ball.left }   : {}),
    ...(ball.right ? { right: ball.right } : {}),
  };

  const glowFilter = isUSDC
    ? "drop-shadow(0 0 16px rgba(255,110,0,0.95)) drop-shadow(0 0 38px rgba(255,55,0,0.55))"
    : "drop-shadow(0 0 16px rgba(175,70,255,0.95)) drop-shadow(0 0 38px rgba(110,30,220,0.55))";

  return (
    <div
      className={`${styles.fireballWrap}${ball.showOnMobile ? " " + styles.mobileShow : ""}`}
      style={posStyle}
    >
      <div
        className={styles.fireballFloat}
        style={{
          position: "relative",
          width: ball.size,
          height: displayH,
          animationName: ball.bobAnimation,
          animationDuration: ball.bobDuration,
          animationDelay: ball.bobDelay,
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          filter: glowFilter,
        }}
      >
        <FireCanvas currency={ball.currency} displaySize={ball.size} />

        {/* Label centred on sphere */}
        <div
          style={{
            position: "absolute",
            top: labelTop,
            left: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <span className={styles.fireSymbol} style={{ fontSize: ball.size * 0.34 }}>
            {isUSDC ? "$" : "◎"}
          </span>
          <span className={styles.fireCurrency} style={{ fontSize: ball.size * 0.13 }}>
            {ball.currency}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HeroCoinsScene() {
  return (
    <div className={styles.heroCoinsScene} aria-hidden="true">
      {FIREBALLS.map((ball, i) => (
        <Fireball key={i} ball={ball} />
      ))}
    </div>
  );
}
