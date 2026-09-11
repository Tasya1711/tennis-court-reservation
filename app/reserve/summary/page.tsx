import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Очікує оплати",
  CONFIRMED: "Підтверджено",
  CANCELLED: "Скасовано",
  EXPIRED: "Термін дії сплив",
};

export default async function ReserveSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/auth");
  }

  if (!id) notFound();

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { court: { select: { name: true } } },
  });

  if (!reservation || reservation.userId !== data.claims.sub) {
    notFound();
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#f4f1ec]">
      {/* Same first-page_photo.jpeg header treatment as /reserve, for
          visual continuity across the booking flow. */}
      <div className="relative h-[28vh] min-h-[200px] w-full overflow-hidden px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
        <Image src="/images/first-page_photo.jpeg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/55" />
        <div className="relative z-10 flex h-full flex-col justify-end">
          <h1 className="text-xl font-medium text-white">Резервація</h1>
          <p className="mt-1 text-sm text-white/70">№ {reservation.orderReference}</p>
        </div>
      </div>

      <div className="relative z-10 -mt-6 rounded-t-[2rem] bg-[#f4f1ec] px-4 pb-10 pt-6 text-neutral-900">
        <div className="space-y-4 rounded-2xl bg-black/[0.04] p-5">
          <Row label="Корт" value={reservation.court.name} />
          <Row label="Дата" value={reservation.date.toISOString().slice(0, 10)} />
          <Row label="Час" value={`${reservation.startTime} – ${reservation.endTime}`} />
          <Row label="Вартість" value={`${reservation.amountUah} ₴`} />
          <Row label="Статус" value={STATUS_LABEL[reservation.status] ?? reservation.status} />
        </div>

        <div className="mt-6 rounded-2xl bg-black/[0.04] p-5 text-center">
          <p className="text-sm text-neutral-600">Оплата буде доступна незабаром.</p>
          <p className="mt-1 text-xs text-neutral-400">
            Місце утримується {" "}
            {Math.max(0, Math.round((reservation.expiresAt.getTime() - Date.now()) / 60000))} хв.
          </p>
        </div>

        <Link
          href="/home"
          className="mt-8 block w-full rounded-full bg-neutral-900 py-4 text-center text-[15px] font-semibold text-white"
        >
          На головну
        </Link>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  );
}
