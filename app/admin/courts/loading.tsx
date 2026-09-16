import { Skeleton } from "@/components/loading/Skeleton";

// Mirrors AdminCourtsScreen's shape — a single responsive layout (no
// desktop split, matching that screen's own structure) with a photo
// header and a list of court rows below. Purely presentational.
export default function AdminCourtsLoading() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#f4f1ec]">
      <div className="relative h-[22vh] min-h-[170px] w-full overflow-hidden bg-neutral-800 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
        <div className="flex items-center justify-between">
          <Skeleton tone="dark" className="h-5 w-40" />
          <Skeleton tone="dark" className="h-10 w-10 rounded-full" />
        </div>
      </div>

      <div className="relative z-10 -mt-6 rounded-t-[2rem] bg-[#f4f1ec] px-4 pb-10 pt-6">
        <Skeleton className="h-[52px] w-full rounded-full" />
        <Skeleton className="mt-8 h-4 w-24" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-black/[0.04] p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
