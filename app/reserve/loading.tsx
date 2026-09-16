import { DesktopSplitScreen } from "@/components/layout/DesktopSplitScreen";
import { Skeleton } from "@/components/loading/Skeleton";

// Mirrors ReserveFlow's shape (photo header + court pills, then a date row
// and a time-slot grid) — purely presentational, since this only shows for
// the brief window before the court list resolves server-side.
function bookingFormSkeleton() {
  return (
    <>
      <Skeleton className="h-3.5 w-40" />
      <div className="mt-3 flex gap-2.5 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-16 shrink-0" />
        ))}
      </div>

      <Skeleton className="mt-6 h-3.5 w-24" />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-[52px] w-32 rounded-full" />
      </div>
    </>
  );
}

function courtPillsSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} tone="dark" className="h-9 w-28 shrink-0 rounded-full" />
      ))}
    </div>
  );
}

export default function ReserveLoading() {
  return (
    <>
      {/* ── Mobile (<768px) ── */}
      <main className="relative min-h-dvh overflow-hidden bg-[#f4f1ec] md:hidden">
        <div className="relative flex h-[46vh] min-h-[340px] w-full flex-col justify-between overflow-hidden bg-neutral-800 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton tone="dark" className="h-10 w-10 rounded-full" />
              <Skeleton tone="dark" className="h-10 w-10 rounded-full" />
            </div>
            <Skeleton tone="dark" className="h-10 w-10 rounded-full" />
          </div>
          {courtPillsSkeleton()}
        </div>

        <div className="relative z-10 -mt-3 rounded-t-[2rem] bg-[#f4f1ec] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
          {bookingFormSkeleton()}
        </div>
      </main>

      {/* ── Tablet/desktop (>=768px) ── */}
      <DesktopSplitScreen avatarUrl={null}>
        <div className="flex flex-1 flex-col items-center bg-[#f4f1ec] px-8 py-8 lg:px-12">
          <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl">
            {courtPillsSkeleton()}
            <div className="mt-6">{bookingFormSkeleton()}</div>
          </div>
        </div>
      </DesktopSplitScreen>
    </>
  );
}
