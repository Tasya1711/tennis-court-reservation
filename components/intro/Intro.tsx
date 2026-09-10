"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Timings tuned for a slow, deliberate "boot screen" feel (background
// reveal → wordmark reveal → brief hold → fade to /auth), similar in
// spirit to how an iPhone reveals its name on first boot. Shortened
// significantly under prefers-reduced-motion — reduced motion means no
// blur/scale sweep, not "make the user wait through the same pacing with
// the effects removed".
const TIMING = {
  full: { backgroundDuration: 1.6, wordmarkDelay: 0.6, wordmarkDuration: 1.0, hold: 1.2 },
  reduced: { backgroundDuration: 0.4, wordmarkDelay: 0.2, wordmarkDuration: 0.4, hold: 0.9 },
};

export function Intro() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const navigatedRef = useRef(false);
  const timing = reduceMotion ? TIMING.reduced : TIMING.full;

  useEffect(() => {
    const totalMs =
      (timing.wordmarkDelay + timing.wordmarkDuration + timing.hold) * 1000;
    const timer = setTimeout(() => go(), totalMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go() {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    setLeaving(true);
    router.push("/auth");
  }

  return (
    <main
      onClick={go}
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden"
    >
      {/* `initial` is deliberately NOT branched on reduceMotion: it becomes
          the server-rendered inline style, and useReducedMotion() resolves
          synchronously on the client but is unknown to the server — making
          `initial` conditional on it causes a hydration mismatch. `animate`
          and `transition` are client-only (never part of the SSR'd HTML),
          so it's safe to vary those instead: reduced motion gets a near-
          instant transition to the same end state. */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0.6, scale: 1.15, filter: "blur(28px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: timing.backgroundDuration, ease: [0.16, 1, 0.3, 1] }}
      >
        <Image
          src="/images/first-page_photo.jpeg"
          alt=""
          fill
          priority
          className="object-cover"
        />
      </motion.div>

      {/* Same darkening treatment as /auth (bg-black/50) — the background
          is meant to read as continuous across the route change. */}
      <div className="absolute inset-0 bg-black/50" />

      <motion.h1
        initial={{ opacity: 0, scale: 0.92, filter: "blur(10px)" }}
        animate={leaving ? { opacity: 0 } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={
          leaving
            ? { duration: 0.35, ease: "easeIn" }
            : { delay: timing.wordmarkDelay, duration: timing.wordmarkDuration, ease: [0.16, 1, 0.3, 1] }
        }
        className="relative z-10 select-none text-6xl font-light lowercase tracking-[0.2em] text-white"
      >
        tennis
      </motion.h1>
    </main>
  );
}
