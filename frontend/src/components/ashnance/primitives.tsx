import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function GlassCard({ className, children, ring }: { className?: string; children: ReactNode; ring?: boolean }) {
  return (
    <div className={cn("rounded-xl p-5 glass", ring && "ring-fire", className)}>
      {children}
    </div>
  );
}

export function FireButton({
  children, onClick, disabled, className, size = "md", type = "button",
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string;
  size?: "sm" | "md" | "lg" | "xl"; type?: "button" | "submit";
}) {
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
    xl: "h-16 px-8 text-lg",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={cn(
        "relative overflow-hidden rounded-md font-semibold tracking-tight",
        "bg-fire text-background transition-all",
        "hover:glow-fire hover:scale-[1.01] active:scale-[0.99]",
        "disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed",
        sizes[size], className,
      )}>
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}

export function GhostButton({ children, onClick, className, size = "md", disabled, type = "button" }: {
  children: ReactNode; onClick?: () => void; className?: string;
  size?: "sm"|"md"|"lg"; disabled?: boolean; type?: "button"|"submit";
}) {
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={cn(
        "rounded-md border border-border bg-transparent text-foreground transition",
        "hover:bg-white/[0.04] hover:border-primary/40",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        sizes[size], className,
      )}>{children}</button>
  );
}

export function StatTile({ label, value, sub, accent, className }: {
  label: string; value: ReactNode; sub?: ReactNode;
  accent?: "fire" | "ash" | "usdc" | "gold"; className?: string;
}) {
  const accentColor = {
    fire: "text-fire", ash: "text-ash",
    usdc: "text-[oklch(0.7_0.13_245)]", gold: "text-gold",
  }[accent ?? "fire"];
  return (
    <div className={cn("glass rounded-xl p-5", className)}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-2 text-3xl font-mono font-semibold", accent && accentColor)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 text-background text-xs font-bold">🥇</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-500 text-background text-xs font-bold">🥈</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 text-background text-xs font-bold">🥉</span>;
  return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-mono text-muted-foreground">{rank}</span>;
}

export function FireProgress({ value, max, className, label }: { value: number; max: number; className?: string; label?: ReactNode }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={cn("w-full", className)}>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div className="h-full progress-fire transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      {label && <div className="mt-1 text-xs text-muted-foreground flex justify-between">{label}<span>{pct.toFixed(1)}%</span></div>}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, sub, className }: { eyebrow?: string; title: string; sub?: string; className?: string }) {
  return (
    <div className={cn("mb-6", className)}>
      {eyebrow && <div className="text-xs uppercase tracking-[0.2em] text-primary mb-2">{eyebrow}</div>}
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="text-muted-foreground mt-2 max-w-2xl">{sub}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div className="glass rounded-xl p-10 text-center">
      <div className="text-4xl mb-3 flex justify-center text-muted-foreground">{icon}</div>
      <div className="font-medium">{title}</div>
      {sub && <div className="mt-1 text-sm text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const map: Record<string, string> = {
    COMPLETED: "bg-success/15 text-success border-success/30",
    ACTIVE:    "bg-success/15 text-success border-success/30",
    PROCESSING:"bg-warning/15 text-warning border-warning/30",
    PENDING:   "bg-muted text-muted-foreground border-border",
    FAILED:    "bg-danger/15 text-danger border-danger/30",
    WITHDRAWN: "bg-muted text-muted-foreground border-border",
    PARTIAL:   "bg-warning/15 text-warning border-warning/30",
    ENDED:     "bg-muted text-muted-foreground border-border",
    CANCELLED: "bg-danger/15 text-danger border-danger/30",
  };
  return <span className={cn(
    "inline-flex items-center px-2 h-5 rounded text-[10px] font-semibold uppercase tracking-wider border",
    map[status] ?? "bg-muted text-muted-foreground border-border",
    className,
  )}>{status}</span>;
}
