"use client";

// Count-up that fires once when scrolled into view. Writes to the DOM node
// directly (no per-frame React re-render) for a smooth, cheap animation.
import { animate, useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { EASE_OUT } from "@/lib/motion";

export function Counter({
  to,
  duration = 1.6,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });

  const format = (v: number) =>
    prefix +
    v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) +
    suffix;

  useEffect(() => {
    if (!seen) return;
    const node = ref.current;
    if (!node) return;
    const controls = animate(0, to, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, to, duration]);

  return (
    <span ref={ref} className={className}>
      {format(0)}
    </span>
  );
}
