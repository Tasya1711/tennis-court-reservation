import Image from "next/image";
import { DesktopSplitScreen } from "@/components/layout/DesktopSplitScreen";
import { Skeleton } from "@/components/loading/Skeleton";

// Shared loading skeleton for the three legal pages (privacy, terms,
// refund policy) — mirrors LegalPage's own shape (photo header + a light
// panel with a title, a notice banner, and a few text sections). Purely
// presentational; the back arrow itself is skipped here since it needs
// real browser history that isn't meaningful mid-load.
function content() {
  return (
    <>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-3 h-14 w-full rounded-xl" />
      <div className="mt-6 space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-8 h-[52px] w-full rounded-full" />
    </>
  );
}

export function LegalLoading() {
  return (
    <>
      {/* ── Mobile (<768px) ── */}
      <main className="relative min-h-dvh overflow-hidden bg-[#f4f1ec] md:hidden">
        <div className="relative h-[20vh] min-h-[140px] w-full overflow-hidden px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
          <Image src="/images/first-page_photo.jpeg" alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/55" />
        </div>

        <div className="relative z-10 -mt-6 rounded-t-[2rem] bg-[#f4f1ec] px-4 pb-10 pt-6">{content()}</div>
      </main>

      {/* ── Tablet/desktop (>=768px) ── */}
      <DesktopSplitScreen avatarUrl={null}>
        <div className="flex flex-1 flex-col items-center bg-[#f4f1ec] px-8 py-8 lg:px-12">
          <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl">{content()}</div>
        </div>
      </DesktopSplitScreen>
    </>
  );
}
