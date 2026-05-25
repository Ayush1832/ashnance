import { useEffect, useState } from "react";
import { mockRound } from "@/lib/mock";
import { socket } from "@/lib/socketClient";
import { fmtUsd } from "@/lib/format";

export function RoundProgressRing({ size = 240 }: { size?: number }) {
  const [pool, setPool] = useState(mockRound.prizePool);
  useEffect(() => socket.on("round:progress", (p: any) =>
    setPool((x) => Math.min(mockRound.prizePoolTarget, x + (p.delta ?? 0)))), []);
  const pct = Math.min(100, (pool / mockRound.prizePoolTarget) * 100);
  const r = (size - 24) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="fireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF4500" />
            <stop offset="100%" stopColor="#FFB800" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={12} stroke="rgba(255,255,255,0.06)" fill="none" />
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={12} stroke="url(#fireGrad)" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Round #{mockRound.number}</div>
        <div className="font-mono text-3xl font-bold mt-1">{fmtUsd(pool)}</div>
        <div className="text-xs text-muted-foreground mt-0.5">of {fmtUsd(mockRound.prizePoolTarget)}</div>
        <div className="text-[10px] uppercase mt-3 text-primary tracking-widest">{pct.toFixed(1)}% filled</div>
      </div>
    </div>
  );
}
