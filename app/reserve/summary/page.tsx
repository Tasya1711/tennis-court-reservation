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
    <main className="flex min-h-dvh flex-col bg-neutral-950 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] text-white">
      <h1 className="text-xl font-medium">Резервація</h1>
      <p className="mt-1 text-sm text-white/50">№ {reservation.orderReference}</p>

      <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <Row label="Корт" value={reservation.court.name} />
        <Row label="Дата" value={reservation.date.toISOString().slice(0, 10)} />
        <Row label="Час" value={`${reservation.startTime} – ${reservation.endTime}`} />
        <Row label="Вартість" value={`${reservation.amountUah} ₴`} />
        <Row label="Статус" value={STATUS_LABEL[reservation.status] ?? reservation.status} />
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
        <p className="text-sm text-white/60">Оплата буде доступна незабаром.</p>
        <p className="mt-1 text-xs text-white/35">
          Місце утримується {" "}
          {Math.max(0, Math.round((reservation.expiresAt.getTime() - Date.now()) / 60000))} хв.
        </p>
      </div>

      <Link
        href="/home"
        className="mt-8 block w-full rounded-full bg-white py-4 text-center text-[15px] font-semibold text-black"
      >
        На головну
      </Link>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/50">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
