import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

// Same visual language as /auth's mobile treatment (components/auth/
// AuthForm.tsx's card over first-page_photo.jpeg) — reused here rather than
// invented, since that's the one glass-card-over-photo look already used
// screen-size-independently across the app, so it needs no separate
// desktop/tablet composition of its own.
export function ErrorScreen({
  code,
  title,
  message,
  retryLabel,
  onRetry,
}: {
  code: string;
  title: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  const t = useTranslations("Errors");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-[max(2rem,env(safe-area-inset-top))]">
      <Image src="/images/first-page_photo.jpeg" alt="" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/15 bg-black/40 p-8 text-center shadow-2xl backdrop-blur-xl">
        <p className="select-none text-7xl font-light tracking-tight text-white">{code}</p>
        <h1 className="mt-3 text-lg font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm text-white/60">{message}</p>

        <div className="mt-7 space-y-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition"
            >
              {retryLabel ?? t("retry")}
            </button>
          )}
          <Link
            href="/"
            className={`block w-full rounded-xl py-3 text-sm font-medium transition ${
              onRetry
                ? "border border-white/15 bg-transparent text-white/70 hover:bg-white/5"
                : "bg-white text-black"
            }`}
          >
            {t("home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
