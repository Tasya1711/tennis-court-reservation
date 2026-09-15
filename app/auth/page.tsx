import Image from "next/image";
import { AuthForm } from "@/components/auth/AuthForm";
import { DesktopSplitScreen } from "@/components/layout/DesktopSplitScreen";

export default function AuthPage() {
  return (
    <>
      {/* ── Mobile (<768px) — unchanged from the approved M4/M2 flow ── */}
      <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-[max(2rem,env(safe-area-inset-top))] md:hidden">
        <Image
          src="/images/first-page_photo.jpeg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        {/* Same darkening as the intro (bg-black/50) — the background reads
            as continuous across the intro → auth navigation. */}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 w-full">
          <AuthForm />
        </div>
      </main>

      {/* ── Tablet/desktop (>=768px) — shared Tennis_desktop composition.
          No avatar yet (nobody's signed in) — DesktopSplitScreen falls
          back to the bundled default photo, same as everywhere else. The
          form is centered within the left panel instead of sitting flush
          against the panel edge. ── */}
      <DesktopSplitScreen avatarUrl={null}>
        <div className="flex flex-1 items-center justify-center bg-neutral-950 px-8 py-8 lg:px-12">
          <div className="w-full max-w-sm">
            <AuthForm />
          </div>
        </div>
      </DesktopSplitScreen>
    </>
  );
}
