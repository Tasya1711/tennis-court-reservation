import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { EditProfileForm } from "@/components/account/EditProfileForm";
import { DesktopSplitScreen } from "@/components/layout/DesktopSplitScreen";

// Same auth/guest guard as /account itself (ARCHITECTURE.md §6: every route
// re-checks the session, not just proxy.ts's optimistic redirect).
export default async function EditProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/auth");
  }

  const profile = await prisma.profile.findUnique({ where: { id: data.claims.sub } });
  if (profile?.role === "GUEST") {
    redirect("/auth");
  }

  const email = data.claims.email ?? "";
  const avatarUrl = profile?.avatarUrl ?? null;
  const username = profile?.username ?? "";

  const header = <h1 className="mb-6 text-lg font-semibold text-white">Редагувати профіль</h1>;

  const emailRow = (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[13px] text-white/50">Email</p>
      <p className="text-[15px] text-white/80">{email}</p>
      <p className="mt-1 text-xs text-white/35">Email і пароль змінити не можна.</p>
    </div>
  );

  return (
    <>
      {/* ── Mobile (<768px) — same full-bleed photo treatment as /auth ── */}
      <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-[max(2rem,env(safe-area-inset-top))] md:hidden">
        <Image src="/images/first-page_photo.jpeg" alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 w-full">
          <div className="mx-auto w-full max-w-sm rounded-3xl border border-white/15 bg-black/40 p-6 shadow-2xl backdrop-blur-xl">
            {header}
            <EditProfileForm initialAvatarUrl={avatarUrl} initialUsername={username} />
            {emailRow}
          </div>
        </div>
      </main>

      {/* ── Tablet/desktop (>=768px) — shared Tennis_desktop composition ── */}
      <DesktopSplitScreen avatarUrl={avatarUrl}>
        <div className="flex flex-1 items-center justify-center bg-neutral-950 px-8 py-8 lg:px-12">
          <div className="w-full max-w-sm">
            {header}
            <EditProfileForm initialAvatarUrl={avatarUrl} initialUsername={username} />
            {emailRow}
          </div>
        </div>
      </DesktopSplitScreen>
    </>
  );
}
