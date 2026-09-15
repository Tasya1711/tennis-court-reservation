"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorScreen } from "@/components/error/ErrorScreen";

// Root-level catch-all for uncaught exceptions in any page/layout below the
// root layout (which keeps rendering around this — Next.js 16 error.js
// convention, ARCHITECTURE.md-appropriate: fixes what broke instead of
// hiding it, but still needs a boundary so one bad request doesn't take
// down the whole screen for the user). `retry` is the current (v16.3+)
// prop name — re-fetches and re-renders the boundary's children.
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("Errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      code="500"
      title={t("serverTitle")}
      message={t("serverMessage")}
      onRetry={retry}
    />
  );
}
