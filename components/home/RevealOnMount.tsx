"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Extracted so HomeScreen itself can be a server component — this is the
// only part of the screen that genuinely needs to run client-side (the
// mount-triggered opacity/y reveal), everything else (images, court grid,
// links) ships as plain server-rendered HTML instead of client JS that has
// to hydrate. Same animation values as before the split, just parameterized
// per call site instead of duplicated three times inline.
//
// `initial` is deliberately NOT branched on reduceMotion — see
// components/intro/Intro.tsx for why (SSR/first-paint hydration mismatch).
export function RevealOnMount({
  children,
  y,
  delay = 0,
  duration = 0.5,
  className,
}: {
  children: ReactNode;
  y: number;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: reduceMotion ? 0.15 : duration, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
