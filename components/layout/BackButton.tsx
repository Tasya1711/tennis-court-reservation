"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

// Same translucent-dark-circle treatment already used for icon buttons on
// both photo headers and light/dark panels alike (see LogoutButton's icon
// variant) — one style that already reads correctly against every
// background this app uses, so no light/dark variant prop is needed here.
// Always navigates to /home — a fixed destination, not browser history —
// per the explicit requirement — regardless of how the user reached the
// page, the arrow must go to /home.
export function BackButton({ className = "" }: { className?: string }) {
  const t = useTranslations("Common");

  return (
    <Link
      href="/home"
      aria-label={t("back")}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
      </svg>
    </Link>
  );
}
