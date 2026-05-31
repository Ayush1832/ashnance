"use client";

// Headline reveal: each word rises from behind a clipping mask with a stagger.
// The overflow-hidden wrapper has vertical padding so descenders (g, y, p)
// aren't clipped at rest. Accessible: the full string is exposed via aria-label.
import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

export function AnimatedWords({
  text,
  className,
  delay = 0,
  stagger = 0.07,
  once = true,
  inViewTrigger = false,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  once?: boolean;
  inViewTrigger?: boolean;
}) {
  const words = text.split(" ");
  const trigger = inViewTrigger
    ? { whileInView: "show" as const, viewport: { once, margin: "0px 0px -10% 0px" } }
    : { animate: "show" as const };

  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden
          className="inline-block overflow-hidden pb-[0.14em] -mb-[0.14em] align-bottom"
        >
          <motion.span
            className="inline-block"
            variants={{ hidden: { y: "115%" }, show: { y: 0 } }}
            initial="hidden"
            transition={{ duration: 0.95, ease: EASE_OUT, delay: delay + i * stagger }}
            {...trigger}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
