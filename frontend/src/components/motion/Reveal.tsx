"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { DURATION, EASE_OUT, inView, staggerContainer, staggerItem } from "@/lib/motion";

/** Single element that rises + un-blurs as it scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 30,
  blur = true,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  blur?: boolean;
  once?: boolean;
}) {
  const variants: Variants = {
    hidden: { opacity: 0, y, filter: blur ? "blur(6px)" : "blur(0px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: DURATION.slow, ease: EASE_OUT, delay },
    },
  };
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: inView.margin }}
    >
      {children}
    </motion.div>
  );
}

/** Container that releases its <StaggerItem> children in sequence. */
export function Stagger({
  children,
  className,
  stagger = 0.09,
  delayChildren = 0,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer(stagger, delayChildren)}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: inView.margin }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
