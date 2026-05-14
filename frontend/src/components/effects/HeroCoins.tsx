"use client";

import { useEffect, useRef } from "react";
import styles from "./herocoins.module.css";

// ─── Config ───────────────────────────────────────────────────────────────────

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

// ─── Fire Simulation Constants ────────────────────────────────────────────────

const CW  = 64;        // canvas pixel width
const CH  = 96;        // canvas pixel height (extra room above sphere for flames)
const SCX = CW / 2;    // sphere centre X
const SCY = CH * 0.72; // sphere centre Y — sits in lower portion of canvas
const SR  = CW * 0.44; // sphere radius in canvas pixels

// ─── Module-level precomputes (run once, shared by all instances) ─────────────

// Spatial alpha mask:
//   inside sphere        → 1.0  (always fully visible)
//   above sphere centre  → gradual fade outward  (flame tongues escape upward)
//   below sphere centre  → very fast fade         (no fire drips downward)
const ALPHA = new Float32Array(CW * CH);
for (let y = 0; y < CH; y++) {
  for (let x = 0; x < CW; x++) {
    const d = Math.sqrt((x - SCX) ** 2 + (y - SCY) ** 2);
    let a: number;
    if (d <= SR) {
      a = 1;
    } else if (y < SCY) {
      // above sphere centre — allow flame tongues to escape
      a = Math.max(0, 1 - (d - SR) / (SR * 1.05));
    } else {
      // below sphere centre — clip off fast
      a = Math.max(0, 1 - (d - SR) / (SR * 0.2));
    }
    ALPHA[y * CW + x] = a;
  }
}

// Sphere core (pixels kept permanently hot) and rim (maximum heat — fire source)
const IN_CORE = new Uint8Array(CW * CH);
const ON_RIM  = new Uint8Array(CW * CH);
for (let y = 0; y < CH; y++) {
  for (let x = 0; x < CW; x++) {
    const d = Math.sqrt((x - SCX) ** 2 + (y - SCY) ** 2);
    if (d < SR * 0.82)                  IN_CORE[y * CW + x] = 1;
    if (d >= SR * 0.82 && d < SR + 2)  ON_RIM[y * CW + x]  = 1;
  }
}

// Flat RGB palette — index i → [R, G, B] stored at [i*3, i*3+1, i*3+2]
function buildPalette(type: "USDC" | "SOL"): Uint8Array {
  const p = new Uint8Array(256 * 3);
  for (let i = 1; i < 256; i++) {
    const t = i / 255;
    let r = 0, g = 0, b = 0;
    if (type === "USDC") {
      // black → deep red → orange → bright yellow → near-white
      if (t < 0.33) {
        r = Math.round((t / 0.33) * 255);
      } else if (t < 0.66) {
        const s = (t - 0.33) / 0.33;
        r = 255; g = Math.round(s * 190);
      } else {
        const s = (t - 0.66) / 0.34;
        r = 255; g = Math.round(190 + s * 65); b = Math.round(s * 200);
      }
    } else {
      // black → deep indigo → vivid violet → bright purple → pale lavender
      if (t < 0.33) {
        const s = t / 0.33;
        r = Math.round(s * 80); b = Math.round(s * 220);
      } else if (t < 0.66) {
        const s = (t - 0.33) / 0.33;
        r = Math.round(80 + s * 175); g = Math.round(s * 50); b = Math.min(255, Math.round(220 + s * 35));
      } else {
        const s = (t - 0.66) / 0.34;
        r = 255; g = Math.round(50 + s * 170); b = 255;
      }
    }
    p[i * 3] = r; p[i * 3 + 1] = g; p[i * 3 + 2] = b;
  }
  return p;
}

const PAL_USDC = buildPalette("USDC");
const PAL_SOL  = buildPalette("SOL");

// ─── Canvas Fire Component ────────────────────────────────────────────────────

function FireCanvas({ currency, displaySize }: { currency: "USDC" | "SOL"; displaySize: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = CW;
    canvas.height = CH;

    const pal  = currency === "USDC" ? PAL_USDC : PAL_SOL;
    const grid = new Uint8Array(CW * CH);
    const img  = ctx.createImageData(CW, CH);
    const data = img.data; // RGBA Uint8ClampedArray

    // Seed sphere hot so there's no cold-start period
    for (let i = 0; i < CW * CH; i++) {
      if (IN_CORE[i] || ON_RIM[i]) grid[i] = 200 + ((Math.random() * 55) | 0);
    }

    let rafId = 0;
    const tick = () => {
      // ── Doom fire propagation ──────────────────────────────────────────────
      // Each pixel inherits a decayed, slightly drifted value from the row below.
      for (let y = 1; y < CH; y++) {
        for (let x = 0; x < CW; x++) {
          const decay = (Math.random() * 3) | 0;            // 0, 1, or 2
          const src   = grid[y * CW + x];
          const nx    = Math.max(0, Math.min(CW - 1, x + ((Math.random() * 3) | 0) - 1));
          grid[(y - 1) * CW + nx] = src > decay ? src - decay : 0;
        }
      }

      // ── Hold sphere core and rim permanently hot ───────────────────────────
      for (let i = 0; i < CW * CH; i++) {
        if (IN_CORE[i]) {
          if (grid[i] < 180) grid[i] = 180 + ((Math.random() * 75) | 0);
        } else if (ON_RIM[i]) {
          grid[i] = 228 + ((Math.random() * 27) | 0);
        }
      }

      // ── Render: map intensity → RGBA, apply spatial alpha mask ────────────
      for (let i = 0; i < CW * CH; i++) {
        const v = grid[i];
        const j = i * 4;
        if (v === 0 || ALPHA[i] === 0) {
          data[j] = data[j + 1] = data[j + 2] = data[j + 3] = 0;
          continue;
        }
        const pi = v * 3;
        data[j]     = pal[pi];
        data[j + 1] = pal[pi + 1];
        data[j + 2] = pal[pi + 2];
        // alpha: fade in at very low intensities, then full; modulated by spatial mask
        const baseA = v < 24 ? v * 9 : 230;
        data[j + 3] = Math.min(255, (baseA * ALPHA[i]) | 0);
      }

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

// ─── Fireball ─────────────────────────────────────────────────────────────────

function Fireball({ ball }: { ball: FireballConfig }) {
  const isUSDC   = ball.currency === "USDC";
  const displayH = Math.round(ball.size * (CH / CW));
  // Sphere centre in CSS pixels relative to the canvas element top
  const sphereCY = Math.round(displayH * (SCY / CH));
  const labelTop = sphereCY - Math.round(ball.size * 0.2);

  return (
    <div
      className={`${styles.fireballWrap}${ball.showOnMobile ? " " + styles.mobileShow : ""}`}
      style={{
        position: "absolute",
        top: ball.top,
        ...(ball.left  ? { left: ball.left }   : {}),
        ...(ball.right ? { right: ball.right } : {}),
      }}
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
          filter: isUSDC
            ? "drop-shadow(0 0 12px rgba(255,100,0,0.95)) drop-shadow(0 0 28px rgba(255,50,0,0.5))"
            : "drop-shadow(0 0 12px rgba(160,50,255,0.95)) drop-shadow(0 0 28px rgba(100,20,220,0.5))",
        }}
      >
        <FireCanvas currency={ball.currency} displaySize={ball.size} />

        {/* Currency label centred on sphere */}
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

// ─── Scene ────────────────────────────────────────────────────────────────────

export default function HeroCoinsScene() {
  return (
    <div className={styles.heroCoinsScene} aria-hidden="true">
      {FIREBALLS.map((ball, i) => (
        <Fireball key={i} ball={ball} />
      ))}
    </div>
  );
}
