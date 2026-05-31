// Shared motion language for Ashnance — premium, deliberate, high-FPS.
// Easing tuples mirror the CSS custom easings in globals.css so JS + CSS motion feel identical.
import type { Variants } from "framer-motion";

/** expo-out — the signature ease for reveals (matches --ease-expo). */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** quint-out — slightly softer settle (matches --ease-quint). */
export const EASE_QUINT: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** gentle overshoot for playful elements (matches --ease-back). */
export const EASE_BACK: [number, number, number, number] = [0.34, 1.4, 0.64, 1];

export const DURATION = {
  fast: 0.45,
  base: 0.7,
  slow: 0.9,
  cinematic: 1.2,
} as const;

/** Single element rises + un-blurs into place. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DURATION.slow, ease: EASE_OUT },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.base, ease: EASE_OUT } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, filter: "blur(8px)" },
  show: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: DURATION.slow, ease: EASE_OUT },
  },
};

/** Parent that releases children one after another. */
export const staggerContainer = (stagger = 0.09, delayChildren = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Child of a staggerContainer. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(5px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
};

/** Viewport config tuned so reveals fire a touch before the element is fully visible. */
export const inView = { once: true, margin: "0px 0px -12% 0px" } as const;
