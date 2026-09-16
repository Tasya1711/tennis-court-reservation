import { DesktopSplitScreen } from "@/components/layout/DesktopSplitScreen";
import { Skeleton } from "@/components/loading/Skeleton";

// Mirrors the reservation summary page's shape (photo header + a details
// card with label/value rows, then a pay button) — purely presentational.
function detailsSkeleton() {
  return (
    <>
      <div className="space-y-4 rounded-2xl bg-black/[0.04] p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 h-14 w-full rounded-full" />
      <Skeleton className="mt-8 h-[52px] w-full rounded-full" />
    </>
  );
}

export default function ReserveSummaryLoading() {
  return (
    <>
      {/* ── Mobile (<768px) ── */}
      <main className="relative min-h-dvh overflow-hidden bg-[#f4f1ec] md:hidden">
        <div className="relative flex h-[28vh] min-h-[200px] w-full flex-col justify-end overflow-hidden bg-neutral-800 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-8">
          <Skeleton tone="dark" className="h-6 w-40" />
          <Skeleton tone="dark" className="mt-2.5 h-3.5 w-52" />
        </div>

        <div className="relative z-10 -mt-3 rounded-t-[2rem] bg-[#f4f1ec] px-4 pb-10 pt-6">
          {detailsSkeleton()}
        </div>
      </main>

      {/* ── Tablet/desktop (>=768px) ── */}
      <DesktopSplitScreen avatarUrl={null}>
        <div className="flex flex-1 flex-col items-center justify-center bg-[#f4f1ec] px-8 py-8 lg:px-12">
          <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-2 h-3.5 w-52" />
            <div className="mt-6">{detailsSkeleton()}</div>
          </div>
        </div>
      </DesktopSplitScreen>
    </>
  );
}
