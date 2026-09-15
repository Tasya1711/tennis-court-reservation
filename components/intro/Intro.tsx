"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Timings tuned for a slow, deliberate "boot screen" feel (background
// reveal → wordmark reveal → brief hold → collapse into the 50/50 layout →
// hand off to the real route), similar in spirit to how an iPhone reveals
// its name on first boot. Shortened significantly under prefers-reduced-
// motion — reduced motion means no blur/scale/collapse sweep, not "make
// the user wait through the same pacing with the effects removed".
const TIMING = {
  full: { backgroundDuration: 1.6, wordmarkDelay: 0.6, wordmarkDuration: 1.0, hold: 1.2, collapseDuration: 0.7 },
  // Shorter, not zero: a 0-duration collapse snaps straight to the final
  // layout with nothing perceptible in between, which reads as "the intro
  // didn't play" even though the full-bleed photo + wordmark still did.
  reduced: { backgroundDuration: 0.3, wordmarkDelay: 0.15, wordmarkDuration: 0.3, hold: 0.7, collapseDuration: 0.3 },
};

type Stage = "reveal" | "collapse";

// Mirrors DesktopSplitScreen's own resting geometry (w-1/2 photo, TENNIS
// label pinned to its top-left corner, p-6/lg:p-8) so that the moment this
// component hands off to the real destination page, the pixels it leaves
// behind already match what that page paints — the actual page swap
// underneath the collapse is then imperceptible, rather than a hard cut
// from a full-bleed photo to a half-width one.
export function Intro({ destination = "/auth" }: { destination?: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>("reveal");
  // Lazy initializer, not an effect + setState: `isDesktop` only ever
  // affects behavior from the 'collapse' stage onward, which can't happen
  // before hydration, so reading matchMedia synchronously here carries no
  // hydration-mismatch risk despite `window` being unavailable during SSR.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
  );
  const navigatedRef = useRef(false);
  const timing = reduceMotion ? TIMING.reduced : TIMING.full;

  // TEMP DEBUG — remove once the intro-skip bug is confirmed fixed.
  useEffect(() => {
    console.log("[INTRO DEBUG] Intro mounted", {
      destination,
      reduceMotion,
      isDesktop,
      timing,
      timeOrigin: performance.timeOrigin,
      now: performance.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const revealMs = (timing.wordmarkDelay + timing.wordmarkDuration + timing.hold) * 1000;
    console.log("[INTRO DEBUG] reveal timer armed, will collapse in", revealMs, "ms at t=", performance.now());
    const timer = setTimeout(collapse, revealMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function collapse() {
    console.log("[INTRO DEBUG] collapse() called at t=", performance.now());
    setStage((s) => (s === "reveal" ? "collapse" : s));
  }

  useEffect(() => {
    if (stage !== "collapse") return;
    // Desktop/tablet waits out the full shrink-to-50/50 animation before
    // handing off; mobile has nothing to shrink (the destination's own
    // mobile tree is already full-bleed), so it only needs to wait for the
    // large wordmark's own fade-out.
    const collapseMs = (isDesktop ? timing.collapseDuration : Math.min(0.35, timing.collapseDuration)) * 1000;
    console.log("[INTRO DEBUG] stage=collapse, navigating to", destination, "in", collapseMs, "ms at t=", performance.now());
    const timer = setTimeout(() => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      console.log("[INTRO DEBUG] router.push firing NOW at t=", performance.now());
      router.push(destination);
    }, collapseMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const collapsed = stage === "collapse" && isDesktop;

  return (
    <main
      onClick={collapse}
      // The dark fallback (matching both /auth's and /home's own left-panel
      // color) means there is never a raw white/gray gap behind the photo —
      // not while the image is still decoding on a cold load, and not
      // during the collapse below.
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-neutral-950"
    >
      {/* Dark panel that grows in behind the photo as it collapses to the
          right half — this becomes the left 50% of the reservation layout.
          Width-only animation (no JS-measured rects), so it stays correct
          at any viewport size. */}
      <motion.div
        className="absolute inset-y-0 left-0 bg-neutral-950"
        initial={false}
        animate={{ width: collapsed ? "50%" : "0%" }}
        transition={{ duration: timing.collapseDuration, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* `initial` is deliberately NOT branched on reduceMotion: it becomes
          the server-rendered inline style, and useReducedMotion() resolves
          synchronously on the client but is unknown to the server — making
          `initial` conditional on it causes a hydration mismatch. `animate`
          and `transition` are client-only (never part of the SSR'd HTML),
          so it's safe to vary those instead: reduced motion gets a near-
          instant transition to the same end state. */}
      <motion.div
        className="absolute inset-y-0 right-0"
        style={{ willChange: "opacity, transform, filter, left" }}
        initial={{ left: 0 }}
        animate={{ left: collapsed ? "50%" : 0 }}
        transition={{ duration: timing.collapseDuration, ease: [0.16, 1, 0.3, 1] }}
      >
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

        {/* Flat tint while the large centered wordmark needs contrast,
            crossfading into the same top-heavy gradient DesktopSplitScreen
            uses once the small corner wordmark takes over. */}
        <motion.div
          className="absolute inset-0 bg-black/50"
          animate={{ opacity: collapsed ? 0 : 1 }}
          transition={{ duration: timing.collapseDuration, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/25"
          animate={{ opacity: collapsed ? 1 : 0 }}
          transition={{ duration: timing.collapseDuration, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Small corner wordmark — same position/style as DesktopSplitScreen's
            "TENNIS" label — fades in as the large centered one fades out. */}
        <motion.span
          className="absolute left-6 top-6 text-sm font-semibold tracking-[0.3em] text-white lg:left-8 lg:top-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: collapsed ? 1 : 0 }}
          transition={{ duration: timing.collapseDuration * 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          TENNIS
        </motion.span>
      </motion.div>

      <motion.h1
        style={{ willChange: "opacity, transform, filter" }}
        initial={{ opacity: 0, scale: 0.92, filter: "blur(10px)" }}
        animate={stage === "collapse" ? { opacity: 0 } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={
          stage === "collapse"
            ? { duration: Math.min(0.35, timing.collapseDuration), ease: "easeIn" }
            : { delay: timing.wordmarkDelay, duration: timing.wordmarkDuration, ease: [0.16, 1, 0.3, 1] }
        }
        className="relative z-10 select-none text-6xl font-light lowercase tracking-[0.2em] text-white"
      >
        tennis
      </motion.h1>
    </main>
  );
}
