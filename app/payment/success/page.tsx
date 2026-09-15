import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Reached only after PaymentStatusPoller confirms CONFIRMED via polling —
// but this page re-verifies that itself, server-side, against the
// database. Nothing about arriving at this URL is trusted on its own;
// anyone can type this URL, so if the reservation isn't genuinely
// CONFIRMED for the current user, they're bounced back rather than shown
// a success screen that isn't true.
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const t = await getTranslations("PaymentSuccess");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/auth");
  }

  if (!ref) notFound();

  const reservation = await prisma.reservation.findUnique({
    where: { orderReference: ref },
    include: { court: { select: { name: true } } },
  });

  if (!reservation || reservation.userId !== data.claims.sub) {
    notFound();
  }
  if (reservation.status !== "CONFIRMED") {
    redirect(`/reserve/summary?id=${reservation.id}`);
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <Image
        src="/images/first-page_photo.jpeg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="scale-110 object-cover blur-md"
      />
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10">
        <p className="text-2xl font-medium text-white">{t("thankYou")}</p>
        <p className="mt-2 text-sm text-white/70">
          {reservation.court.name} · {reservation.date.toISOString().slice(0, 10)} · {reservation.startTime}–{reservation.endTime}
        </p>
        <Link
          href="/home"
          className="mt-8 inline-block w-full rounded-full bg-white px-10 py-4 text-[15px] font-semibold text-black"
        >
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
