"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// Same translucent-dark-circle treatment already used for icon buttons on
// both photo headers and light/dark panels alike (see LogoutButton's icon
// variant) — one style that already reads correctly against every
// background this app uses, so no light/dark variant prop is needed here.
//
// Two distinct navigation modes, per explicit requirement:
// - Default (Account, reserve date/time screen): a FIXED destination
//   (/home) — never browser history, regardless of how the user arrived.
// - `useHistory` (legal/info pages): real browser history (router.back()),
//   since those pages can be opened from anywhere (home, checkout, etc.)
//   and should return to wherever the user actually came from.
export function BackButton({
  href = "/home",
  useHistory = false,
  className = "",
}: {
  href?: string;
  useHistory?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const t = useTranslations("Common");

  const sharedClassName = `flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 ${className}`;
  const icon = (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );

  if (useHistory) {
    return (
      <button type="button" onClick={() => router.back()} aria-label={t("back")} className={sharedClassName}>
        {icon}
      </button>
    );
  }

  return (
    <Link href={href} aria-label={t("back")} className={sharedClassName}>
      {icon}
    </Link>
  );
}
