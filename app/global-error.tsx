"use client"; // Error boundaries must be Client Components

import { ErrorScreen } from "@/components/error/ErrorScreen";
import "./globals.css";

// Only fires if the ROOT layout itself fails to render — app/error.tsx
// handles everything else. Must define its own <html>/<body> (it replaces
// the root layout when active) and import global styles itself, since
// nothing above it is still mounted to provide them.
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="uk" className="h-full antialiased">
      <body className="min-h-full">
        <ErrorScreen
          code="500"
          title="Щось пішло не так"
          message="Сталася непередбачена помилка. Спробуйте ще раз."
          onRetry={retry}
        />
      </body>
    </html>
  );
}
