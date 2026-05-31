import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const DOT: Record<string, string> = {
  fire: "bg-fire",
  gold: "bg-gold",
  ash: "bg-ash",
  success: "bg-success",
  usdc: "bg-[oklch(0.58_0.14_245)]",
};

/** Small uppercase tracked label with a colored status dot. */
export function Eyebrow({
  children,
  accent = "fire",
  className,
}: {
  children: ReactNode;
  accent?: keyof typeof DOT;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT[accent])} />
      {children}
    </div>
  );
}
