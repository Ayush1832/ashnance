"use client";

// Seamless marquee — two identical tracks translate as one group by -50%,
// so the loop is invisible. Edges fade out via the mask utility.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Marquee({
  children,
  className,
  reverse = false,
  pauseOnHover = true,
}: {
  children: ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
}) {
  return (
    <div className={cn("mask-fade-x overflow-hidden", className)}>
      <div
        className={cn(
          "flex w-max animate-marquee",
          pauseOnHover && "hover:[animation-play-state:paused]",
        )}
        style={reverse ? { animationDirection: "reverse" } : undefined}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
