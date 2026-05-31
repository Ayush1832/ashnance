"use client";

// Layered molten aurora. Four blurred blobs drift on independent organic
// timings (CSS) across two parallax depths that ease toward the cursor (JS).
// Warm fire core + gold highlight, with one cool violet blob for richness so
// it reads "premium fire" rather than "neon crypto". Parallax is skipped on
// touch + reduced-motion; the drift keyframes self-disable under reduced-motion.
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function AuroraBackground({
  className,
  intensity = 1,
}: {
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let raf = 0;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
    };
    const loop = () => {
      cur.x += (target.x - cur.x) * 0.05;
      cur.y += (target.y - cur.y) * 0.05;
      el.style.setProperty("--px", `${(cur.x * 38).toFixed(2)}px`);
      el.style.setProperty("--py", `${(cur.y * 38).toFixed(2)}px`);
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {/* far layer — slow drift, gentle parallax */}
      <div
        className="absolute inset-0"
        style={{ transform: "translate3d(calc(var(--px,0px) * 0.35), calc(var(--py,0px) * 0.35), 0)" }}
      >
        <div
          className="aurora-blob anim-drift-a"
          style={{
            width: "48vw",
            height: "48vw",
            left: "-10vw",
            top: "-16vh",
            opacity: 0.5 * intensity,
            background: "radial-gradient(circle at 35% 35%, var(--ember-core), transparent 68%)",
          }}
        />
        <div
          className="aurora-blob anim-drift-c"
          style={{
            width: "42vw",
            height: "42vw",
            right: "-10vw",
            top: "0vh",
            opacity: 0.4 * intensity,
            background: "radial-gradient(circle at 60% 40%, var(--ember-deep), transparent 70%)",
          }}
        />
      </div>
      {/* near layer — larger parallax, gold + violet accents */}
      <div
        className="absolute inset-0"
        style={{ transform: "translate3d(var(--px,0px), var(--py,0px), 0)" }}
      >
        <div
          className="aurora-blob anim-drift-b"
          style={{
            width: "34vw",
            height: "34vw",
            left: "22vw",
            top: "10vh",
            opacity: 0.38 * intensity,
            background: "radial-gradient(circle at 50% 50%, var(--ember-gold), transparent 66%)",
          }}
        />
        <div
          className="aurora-blob anim-drift-a"
          style={{
            width: "30vw",
            height: "30vw",
            right: "14vw",
            bottom: "-8vh",
            opacity: 0.3 * intensity,
            background: "radial-gradient(circle at 40% 60%, var(--ember-violet), transparent 68%)",
          }}
        />
      </div>
    </div>
  );
}
