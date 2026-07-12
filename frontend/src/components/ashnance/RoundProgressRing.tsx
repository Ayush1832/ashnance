import { useEffect, useState } from "react";
import { socket } from "@/lib/socketClient";
import { fmtUsd } from "@/lib/format";
import type { Round } from "@/lib/types";

interface Props {
  size?: number;
  round?: Round | null;
}

export function RoundProgressRing({ size = 240, round }: Props) {
  const initialPool   = round?.prizePool   ?? 0;
  const targetPool    = round?.prizePoolTarget ?? 500;
  const roundNumber   = round?.number ?? null;

  const [pool, setPool] = useState(initialPool);

  // Reset pool when round changes
  useEffect(() => {
    setPool(initialPool);
  }, [initialPool]);

  // Subscribe to live pool progress updates
  useEffect(() => {
    return socket.on("round:progress", (p: unknown) => {
      const payload = p as { currentPool?: number; delta?: number };
      if (payload.currentPool !== undefined) {
        setPool(payload.currentPool);
      } else if (payload.delta !== undefined) {
        setPool((x) => Math.min(targetPool, x + payload.delta!));
      }
    });
  }, [targetPool]);

  const pct = targetPool > 0 ? Math.min(100, (pool / targetPool) * 100) : 0;
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
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {roundNumber ? `Round #${roundNumber}` : "No round"}
        </div>
        <div className="font-mono text-3xl font-bold mt-1">{fmtUsd(pool)}</div>
        <div className="text-xs text-muted-foreground mt-0.5">of {fmtUsd(targetPool)}</div>
        {pct >= 100 ? (
          <div className="text-[10px] uppercase mt-3 text-gold tracking-widest font-bold">Target hit — winner takes all</div>
        ) : (
          <div className="text-[10px] uppercase mt-3 text-primary tracking-widest">{pct.toFixed(1)}% filled</div>
        )}
      </div>
    </div>
  );
}
