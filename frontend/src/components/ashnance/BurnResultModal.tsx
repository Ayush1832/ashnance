"use client";

import { useEffect, useState } from "react";
import { X, Trophy, TrendingUp, Flame } from "lucide-react";
import { fmtUsd, fmtNum } from "@/lib/format";

export interface BurnResult {
  amount: number;
  weight: number;
  ash: number;
  newRank: number;
  prizePool: number;
  prizePoolTarget: number;
}

function FireParticles() {
  const items = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2;
    const dist = 100 + (i % 3) * 40;
    const bx = Math.cos(angle) * dist;
    const by = Math.sin(angle) * dist;
    const colors = ["#FF4500", "#FFB800", "#FF6B00", "#FFD700", "#FF2200", "#FF8C00"];
    const color = colors[i % colors.length];
    const delay = ((i % 6) * 0.05).toFixed(2);
    const size = 5 + (i % 4) * 3;
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
            animation: `burst-particle 0.9s ease-out ${delay}s forwards`,
          }}
        />
      ))}
    </>
  );
}

export function BurnResultModal({ result, onClose }: { result: BurnResult; onClose: () => void }) {
  const [phase, setPhase] = useState<"burning" | "done">("burning");
  const poolPct = Math.min(100, (result.prizePool / result.prizePoolTarget) * 100);
  const isTop3 = result.newRank <= 3;

  useEffect(() => {
    const t = setTimeout(() => setPhase("done"), 950);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/88 backdrop-blur-xl" />

      {phase === "done" && <FireParticles />}

      <div
        className="relative z-10 glass-elevated rounded-2xl p-8 max-w-md w-full text-center"
        style={{ boxShadow: "0 0 80px rgba(255,69,0,0.35), 0 0 160px rgba(255,69,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {phase === "burning" ? (
          <div className="py-12">
            <div className="flex justify-center mb-6">
              <Flame className="h-20 w-20 text-fire" style={{ animation: "fire-rotate 0.4s linear infinite, pulse 0.5s ease-in-out infinite" }} />
            </div>
            <div className="font-display text-3xl font-extrabold text-fire tracking-tight" style={{ animation: "pulse 0.5s ease-in-out infinite" }}>
              BURNING...
            </div>
            <div className="text-muted-foreground text-sm mt-3">Sending {fmtUsd(result.amount)} to the flame</div>
          </div>
        ) : (
          <div style={{ animation: "slide-in-top 0.35s ease-out" }}>
            {/* Header */}
            <div className="text-5xl mb-3">🔥</div>
            <div className="font-display text-4xl font-extrabold tracking-tight" style={{ background: "linear-gradient(135deg, #FF4500, #FFB800)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              BURN COMPLETE
            </div>
            <div className="text-muted-foreground text-sm mt-1 mb-6">
              You incinerated <span className="font-mono font-bold text-foreground">{fmtUsd(result.amount)}</span> USDC
            </div>

            {/* Stats */}
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
                <div className="font-mono text-2xl font-bold text-[oklch(0.7_0.13_245)]">{poolPct.toFixed(1)}%</div>
              </div>
            </div>

            {/* Pool bar */}
            <div className="mb-5">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>Prize Pool</span>
                <span className="font-mono text-foreground">{fmtUsd(result.prizePool)} / {fmtUsd(result.prizePoolTarget)}</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${poolPct}%`,
                    background: "linear-gradient(90deg, #FF4500, #FFB800)",
                    boxShadow: "0 0 10px #FF4500",
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
            {isTop3 && result.newRank > 1 && (
              <div className="glass rounded-xl p-3 mb-4 border border-fire/30 flex items-center gap-2 justify-center text-fire">
                <TrendingUp className="h-5 w-5 shrink-0" />
                <span className="font-semibold">Top 3! Burn more to take #1</span>
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
