import Image from "next/image";
import { AuthForm } from "@/components/auth/AuthForm";

export default function AuthPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-[max(2rem,env(safe-area-inset-top))]">
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
  );
}
