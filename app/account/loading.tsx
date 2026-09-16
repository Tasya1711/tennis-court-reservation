import { DesktopSplitScreen } from "@/components/layout/DesktopSplitScreen";
import { Skeleton } from "@/components/loading/Skeleton";

// Mirrors AccountScreen's shape (photo header with avatar/name, then a
// light panel listing reservation cards) — purely presentational, no
// interactive elements, since this only shows for the brief window before
// the real server-rendered account data resolves.
function reservationCardSkeleton(key: number) {
  return (
    <div key={key} className="rounded-2xl bg-black/[0.04] p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="mt-4 space-y-2.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

export default function AccountLoading() {
  const cards = <div className="mt-4 space-y-3">{[0, 1, 2].map(reservationCardSkeleton)}</div>;

  return (
    <>
      {/* ── Mobile (<768px) ── */}
      <main className="relative min-h-dvh overflow-hidden bg-[#f4f1ec] md:hidden">
        <div className="relative h-[30vh] min-h-[220px] w-full overflow-hidden bg-neutral-800 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
          <div className="flex items-center justify-between">
            <Skeleton tone="dark" className="h-10 w-10 rounded-full" />
            <div className="flex items-center gap-2">
              <Skeleton tone="dark" className="h-10 w-10 rounded-full" />
              <Skeleton tone="dark" className="h-10 w-10 rounded-full" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Skeleton tone="dark" className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton tone="dark" className="h-4 w-32" />
              <Skeleton tone="dark" className="h-3 w-44" />
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-6 rounded-t-[2rem] bg-[#f4f1ec] px-4 pb-10 pt-6">
          <Skeleton className="h-4 w-32" />
          {cards}
        </div>
      </main>

      {/* ── Tablet/desktop (>=768px) ── */}
      <DesktopSplitScreen avatarUrl={null}>
        <div className="flex flex-1 flex-col items-center bg-[#f4f1ec] px-8 py-8 text-neutral-900 lg:px-12">
          <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <Skeleton className="mt-8 h-4 w-32" />
            {cards}
          </div>
        </div>
      </DesktopSplitScreen>
    </>
  );
}
