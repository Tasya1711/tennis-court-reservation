import { DesktopSplitScreen } from "@/components/layout/DesktopSplitScreen";
import { Skeleton } from "@/components/loading/Skeleton";

// Mirrors HomeScreen's own shape (photo header + dark content panel with a
// court grid and a coach card) so the loading state reads as "this page,
// still loading" rather than a generic spinner. No real data/translations
// needed here — this only renders for the brief window before the real
// server component resolves.
export default function HomeLoading() {
  const courtGrid = (
    <div className="mt-3 grid grid-cols-3 gap-2.5">
      <div aria-hidden />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} tone="dark" className="h-20" />
      ))}
    </div>
  );

  const coachCard = (
    <div className="mt-5 flex gap-3 rounded-2xl bg-white/5 p-3">
      <Skeleton tone="dark" className="h-16 w-16 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <Skeleton tone="dark" className="h-3.5 w-3/4" />
        <Skeleton tone="dark" className="h-3 w-1/2" />
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile (<768px) ── */}
      <main className="min-h-dvh bg-neutral-950 md:hidden">
        <div className="relative flex h-[42vh] min-h-[300px] w-full flex-col justify-between overflow-hidden bg-neutral-900 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-9">
          <Skeleton tone="dark" className="h-11 w-11 rounded-full" />
          <div className="space-y-2">
            <Skeleton tone="dark" className="h-5 w-40" />
            <Skeleton tone="dark" className="h-3.5 w-56" />
          </div>
        </div>

        <div className="relative z-10 -mt-6 rounded-t-[2rem] bg-neutral-950 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
          <div className="flex items-baseline justify-between">
            <Skeleton tone="dark" className="h-4 w-24" />
            <Skeleton tone="dark" className="h-3 w-28" />
          </div>
          {courtGrid}
          <div className="mt-5 h-px bg-white/10" />
          {coachCard}
          <Skeleton tone="dark" className="mt-5 h-[52px] w-full rounded-full" />
        </div>
      </main>

      {/* ── Tablet/desktop (>=768px) ── */}
      <DesktopSplitScreen avatarUrl={null}>
        <div className="flex flex-1 flex-col items-center justify-center bg-neutral-950 px-8 py-8 lg:px-12 lg:py-10">
          <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl">
            <Skeleton tone="dark" className="h-4 w-40" />
            <Skeleton tone="dark" className="mt-2 h-3.5 w-56" />
            <div className="mt-6 flex items-baseline justify-between">
              <Skeleton tone="dark" className="h-4 w-24" />
              <Skeleton tone="dark" className="h-3 w-28" />
            </div>
            {courtGrid}
            <div className="mt-5 h-px bg-white/10" />
            {coachCard}
            <Skeleton tone="dark" className="mt-6 h-[52px] w-full max-w-xs rounded-full" />
          </div>
        </div>
      </DesktopSplitScreen>
    </>
  );
}
