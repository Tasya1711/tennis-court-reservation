import { Skeleton } from "@/components/loading/Skeleton";

// Mirrors the avatar-onboarding page's shape — a single full-bleed-photo
// layout (no desktop split, matching that page's own structure) with a
// centered glass card. Purely presentational.
export default function AvatarOnboardingLoading() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-neutral-900 px-4 py-[max(2rem,env(safe-area-inset-top))]">
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/15 bg-black/40 p-6 text-center shadow-2xl backdrop-blur-xl">
        <Skeleton tone="dark" className="mx-auto h-5 w-44" />
        <Skeleton tone="dark" className="mx-auto mb-6 mt-2 h-3.5 w-56" />
        <Skeleton tone="dark" className="mx-auto mb-5 h-32 w-32 rounded-full" />
        <div className="space-y-3">
          <Skeleton tone="dark" className="h-11 w-full rounded-xl" />
          <Skeleton tone="dark" className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </main>
  );
}
