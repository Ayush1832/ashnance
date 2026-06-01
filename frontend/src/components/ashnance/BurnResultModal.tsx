"use client";

import { useEffect, useState } from "react";
import { X, Trophy, TrendingUp } from "lucide-react";
import { fmtUsd, fmtNum } from "@/lib/format";
import CoinBurn3D from "@/components/effects/CoinBurn3D";

export interface BurnResult {
  amount: number;
  weight: number;
  ash: number;
  newRank: number;
  prizePool: number;
  prizePoolTarget: number;
}

function FireParticles() {
  const items = Array.from({ length: 32 }, (_, i) => {
    const angle = (i / 32) * Math.PI * 2;
    const dist = 90 + (i % 4) * 35;
    const bx = Math.cos(angle) * dist;
    const by = Math.sin(angle) * dist;
    const colors = ["#FF4500", "#FFB800", "#FF6B00", "#FFD700", "#FF2200", "#FF8C00"];
    const color = colors[i % colors.length];
    const delay = ((i % 8) * 0.04).toFixed(2);
    const size = 5 + (i % 5) * 2;
    return { i, bx, by, color, delay, size };
  });

  return (
    <>
      {items.map(({ i, bx, by, color, delay, size }) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size,
            height: size,
            background: color,
            boxShadow: `0 0 ${size * 2}px ${color}`,
            top: "50%",
            left: "50%",
            marginTop: -(size / 2),
            marginLeft: -(size / 2),
            ["--bx" as string]: `${bx}px`,
            ["--by" as string]: `${by}px`,
            animation: `burst-particle 1s ease-out ${delay}s forwards`,
          }}
        />
      ))}
    </>
  );
}

export function BurnResultModal({ result, onClose }: { result: BurnResult; onClose: () => void }) {
  // "burning" → coin is on fire | "dissolving" → coin shrinks away | "done" → show results
  const [phase, setPhase] = useState<"burning" | "dissolving" | "done">("burning");
  const poolPct = Math.min(100, (result.prizePool / result.prizePoolTarget) * 100);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("dissolving"), 1600);
    const t2 = setTimeout(() => setPhase("done"),       2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={phase === "done" ? onClose : undefined}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-xl" />

      {/* Particle burst — only on done phase */}
      {phase === "done" && <FireParticles />}

      <div
        className="relative z-10 glass-elevated rounded-2xl w-full max-w-md overflow-hidden"
        style={{ boxShadow: "0 0 80px rgba(255,69,0,0.35), 0 0 160px rgba(255,69,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── BURNING PHASE: USDC coin on fire ── */}
        {phase !== "done" && (
          <div className="flex flex-col items-center px-8 pt-10 pb-8">
            {/* Close only when done */}
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-6">
              Burning {fmtUsd(result.amount)} USDC
            </div>

            {/* The coin — CoinBurn3D handles fire canvas particles */}
            <div className="relative flex items-center justify-center" style={{ height: 220 }}>
              <CoinBurn3D
                currency="USDC"
                amount={result.amount}
                size={180}
                phase={phase === "burning" ? "burning" : "done"}
              />
            </div>

            <div
              className="mt-6 font-display text-3xl font-extrabold tracking-tight text-fire"
              style={{ animation: "pulse 0.5s ease-in-out infinite" }}
            >
              {phase === "burning" ? "BURNING..." : "INCINERATED"}
            </div>
            <div className="text-muted-foreground text-sm mt-2">
              {phase === "burning"
                ? "Your USDC is going up in flames"
                : "Calculating your rewards..."}
            </div>
          </div>
        )}

        {/* ── DONE PHASE: Results ── */}
        {phase === "done" && (
          <div className="p-8 text-center" style={{ animation: "slide-in-top 0.4s ease-out" }}>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Fire header */}
            <div className="text-5xl mb-3">🔥</div>
            <div
              className="font-display text-4xl font-extrabold tracking-tight mb-1"
              style={{
                background: "linear-gradient(135deg, #FF4500 0%, #FFB800 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              BURN COMPLETE
            </div>
            <div className="text-muted-foreground text-sm mb-6">
              You incinerated{" "}
              <span className="font-mono font-bold text-foreground">{fmtUsd(result.amount)}</span>{" "}
              USDC
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="glass rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Weight Gained</div>
                <div className="font-mono text-2xl font-bold text-fire">+{result.weight.toFixed(2)}</div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">ASH Earned</div>
                <div className="font-mono text-2xl font-bold text-ash">+{fmtNum(result.ash)}</div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Your Rank</div>
                <div className={`font-mono text-2xl font-bold ${result.newRank === 1 ? "text-gold" : "text-foreground"}`}>
                  #{result.newRank}
                </div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Pool Filled</div>
                <div className="font-mono text-2xl font-bold text-[oklch(0.7_0.13_245)]">
                  {poolPct.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Pool progress bar */}
            <div className="mb-5">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>Prize Pool</span>
                <span className="font-mono text-foreground">
                  {fmtUsd(result.prizePool)} / {fmtUsd(result.prizePoolTarget)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${poolPct}%`,
                    background: "linear-gradient(90deg, #FF4500, #FFB800)",
                    boxShadow: "0 0 12px #FF4500",
                    transition: "width 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              </div>
            </div>

            {/* Rank callout */}
            {result.newRank === 1 && (
              <div className="glass rounded-xl p-3 mb-4 border border-gold/50 flex items-center gap-2 justify-center text-gold">
                <Trophy className="h-5 w-5 shrink-0" />
                <span className="font-display font-bold">RANK #1 — THE POOL IS YOURS!</span>
              </div>
            )}
            {result.newRank <= 3 && result.newRank > 1 && (
              <div className="glass rounded-xl p-3 mb-4 border border-primary/30 flex items-center gap-2 justify-center text-fire">
                <TrendingUp className="h-5 w-5 shrink-0" />
                <span className="font-semibold">Top 3! Keep burning to claim #1</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full h-12 rounded-md font-bold tracking-tight text-background transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #FF4500 0%, #FF8C00 100%)",
                boxShadow: "0 0 24px rgba(255,69,0,0.45)",
              }}
            >
              KEEP BURNING 🔥
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
