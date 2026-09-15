import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AvatarOnboardingForm } from "@/components/onboarding/AvatarOnboardingForm";

export default async function AvatarOnboardingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/auth");
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-[max(2rem,env(safe-area-inset-top))]">
      <Image src="/images/first-page_photo.jpeg" alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 w-full">
        <AvatarOnboardingForm />
      </div>
    </main>
  );
}
