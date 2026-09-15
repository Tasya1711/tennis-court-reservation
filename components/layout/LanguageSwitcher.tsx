"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { setUserLocale } from "@/i18n/actions";
import type { Locale } from "@/i18n/locale";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(() => {
      setUserLocale(next);
    });
  }

  return (
    <div
      className={`inline-flex overflow-hidden rounded-full bg-black/30 p-0.5 text-[11px] font-semibold backdrop-blur-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => switchTo("uk")}
        aria-pressed={locale === "uk"}
        disabled={isPending}
        className={`rounded-full px-2.5 py-1 transition disabled:opacity-60 ${
          locale === "uk" ? "bg-white text-black" : "text-white/70"
        }`}
      >
        UA
      </button>
      <button
        type="button"
        onClick={() => switchTo("en")}
        aria-pressed={locale === "en"}
        disabled={isPending}
        className={`rounded-full px-2.5 py-1 transition disabled:opacity-60 ${
          locale === "en" ? "bg-white text-black" : "text-white/70"
        }`}
      >
        EN
      </button>
    </div>
  );
}
