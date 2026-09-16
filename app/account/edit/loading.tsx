import { DesktopSplitScreen } from "@/components/layout/DesktopSplitScreen";
import { Skeleton } from "@/components/loading/Skeleton";

// Mirrors the edit-profile page's shape (a dark glass card over the photo,
// or the same card inside the shared desktop panel) — purely
// presentational, matching EditProfileForm's own layout.
function cardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-3xl border border-white/15 bg-black/40 p-6 shadow-2xl backdrop-blur-xl">
      <Skeleton tone="dark" className="h-5 w-40" />
      <Skeleton tone="dark" className="mx-auto mb-3 mt-6 h-28 w-28 rounded-full" />
      <div className="mt-6 space-y-2">
        <Skeleton tone="dark" className="h-3 w-24" />
        <Skeleton tone="dark" className="h-11 w-full" />
      </div>
      <Skeleton tone="dark" className="mt-4 h-11 w-full rounded-xl" />
      <Skeleton tone="dark" className="mt-6 h-16 w-full rounded-xl" />
    </div>
  );
}

export default function EditProfileLoading() {
  return (
    <>
      {/* ── Mobile (<768px) ── */}
      <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-neutral-950 px-4 py-[max(2rem,env(safe-area-inset-top))] md:hidden">
        <div className="relative z-10 w-full">{cardSkeleton()}</div>
      </main>

      {/* ── Tablet/desktop (>=768px) ── */}
      <DesktopSplitScreen avatarUrl={null}>
        <div className="flex flex-1 items-center justify-center bg-neutral-950 px-8 py-8 lg:px-12">
          <div className="w-full max-w-sm">{cardSkeleton()}</div>
        </div>
      </DesktopSplitScreen>
    </>
  );
}
