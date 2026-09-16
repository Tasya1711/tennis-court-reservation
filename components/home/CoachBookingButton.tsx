"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// Coach booking isn't implemented yet — this deliberately does nothing
// that looks like a real reservation flow. Same visible pill as before
// (same classes, same position via the parent's self-start/mt-2), just
// wrapped so a small auto-dismissing toast can anchor to it — no modal
// library, matching the app's existing lightweight inline-message pattern
// (e.g. AuthForm's formError/infoMessage).
export function CoachBookingButton() {
  const t = useTranslations("Home");
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (!showMessage) return;
    const timer = setTimeout(() => setShowMessage(false), 3000);
    return () => clearTimeout(timer);
  }, [showMessage]);

  return (
    <div className="relative mt-2 self-start">
      <button
        type="button"
        onClick={() => setShowMessage(true)}
        className="rounded-full bg-lime-300 px-3 py-1 text-[11px] font-semibold text-black transition active:scale-[0.97]"
      >
        {t("coachCta")}
      </button>
      {showMessage && (
        <div
          role="status"
          className="absolute left-0 top-full z-20 mt-2 w-max max-w-[220px] rounded-lg bg-neutral-900 px-3 py-2 text-[11px] text-white shadow-lg ring-1 ring-white/10"
        >
          {t("coachComingSoon")}
        </div>
      )}
    </div>
  );
}
