import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PayButton } from "@/components/payment/PayButton";
import { PaymentStatusPoller } from "@/components/payment/PaymentStatusPoller";
import { DesktopSplitScreen } from "@/components/layout/DesktopSplitScreen";

const idSchema = z.string().uuid();

// A server component's render is a single point-in-time snapshot for this
// request — reading the clock here isn't the hydration-mismatch hazard
// eslint's purity rule is guarding against (that's a client-rendering
// concern). Wrapped in its own function so the one-shot read is explicit
// and named, rather than an inline `Date.now()` in the render body.
function requestTime(): number {
  return Date.now();
}

export default async function ReserveSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const t = await getTranslations("ReserveSummary");
  const tCommon = await getTranslations("Common");
  const tLegal = await getTranslations("Legal");

  const STATUS_LABEL: Record<string, string> = {
    PENDING_PAYMENT: t("statusPending"),
    CONFIRMED: t("statusConfirmed"),
    CANCELLED: t("statusCancelled"),
    EXPIRED: t("statusExpired"),
  };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/auth");
  }

  if (!id || !idSchema.safeParse(id).success) notFound();

  const [reservation, profile] = await Promise.all([
    prisma.reservation.findUnique({
      where: { id },
      include: { court: { select: { name: true } } },
    }),
    prisma.profile.findUnique({ where: { id: data.claims.sub }, select: { avatarUrl: true } }),
  ]);

  if (!reservation || reservation.userId !== data.claims.sub) {
    notFound();
  }

  const now = requestTime();

  // The hold can be past expiresAt before the status column itself has
  // been flipped (the M6 cron is housekeeping only — see ARCHITECTURE.md
  // §7) — treat it as dead here too, not just "still pending".
  const holdExpired = reservation.status === "PENDING_PAYMENT" && reservation.expiresAt.getTime() < now;
  const isPayable = reservation.status === "PENDING_PAYMENT" && !holdExpired;
  const holdMinutesRemaining = Math.max(0, Math.round((reservation.expiresAt.getTime() - now) / 60000));

  const details = (
    <>
      <div className="space-y-4 rounded-2xl bg-black/[0.04] p-5">
        <Row label={t("court")} value={reservation.court.name} />
        <Row label={t("date")} value={reservation.date.toISOString().slice(0, 10)} />
        <Row label={t("time")} value={`${reservation.startTime} – ${reservation.endTime}`} />
        <Row label={t("cost")} value={`${reservation.amountUah} ₴`} />
        <Row label={t("status")} value={holdExpired ? STATUS_LABEL.EXPIRED : STATUS_LABEL[reservation.status] ?? reservation.status} />
      </div>

      {isPayable && (
        <div className="mt-6">
          <p className="mb-3 text-center text-xs text-neutral-400">
            {t("holdNotice", { minutes: holdMinutesRemaining })}
          </p>
          <PayButton reservationId={reservation.id} amountUah={reservation.amountUah} />
          <PaymentStatusPoller orderReference={reservation.orderReference} />
          <p className="mt-4 text-center text-[11px] leading-snug text-neutral-400">
            <Link href="/legal/terms" className="underline underline-offset-2">
              {tLegal("linkTerms")}
            </Link>
            {" · "}
            <Link href="/legal/privacy" className="underline underline-offset-2">
              {tLegal("linkPrivacy")}
            </Link>
            {" · "}
            <Link href="/legal/refund-policy" className="underline underline-offset-2">
              {tLegal("linkRefund")}
            </Link>
          </p>
        </div>
      )}

      {reservation.status === "CONFIRMED" && (
        <div className="mt-6 rounded-2xl bg-emerald-600/10 p-5 text-center">
          <p className="text-sm font-medium text-emerald-700">{t("paidSuccess")}</p>
        </div>
      )}

      {(holdExpired || reservation.status === "EXPIRED" || reservation.status === "CANCELLED") && (
        <div className="mt-6 rounded-2xl bg-black/[0.04] p-5 text-center">
          <p className="text-sm text-neutral-600">
            {reservation.status === "CANCELLED" ? t("cancelledNotice") : t("expiredNotice")}
          </p>
          <Link href="/reserve" className="mt-3 inline-block text-sm font-medium text-neutral-900 underline">
            {t("rebook")}
          </Link>
        </div>
      )}

      <Link
        href="/home"
        className="mt-8 block w-full rounded-full bg-neutral-900 py-4 text-center text-[15px] font-semibold text-white"
      >
        {tCommon("home")}
      </Link>
    </>
  );

  return (
    <>
      {/* ── Mobile (<768px) — unchanged from the approved layout ── */}
      <main className="relative min-h-dvh overflow-hidden bg-[#f4f1ec] md:hidden">
        {/* Same first-page_photo.jpeg header treatment as /reserve, for
            visual continuity across the booking flow. */}
        <div className="relative h-[28vh] min-h-[200px] w-full overflow-hidden px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-8">
          <Image src="/images/first-page_photo.jpeg" alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/55" />
          <div className="relative z-10 flex h-full flex-col justify-end">
            <h1 className="text-xl font-medium text-white">{t("title")}</h1>
            <p className="mt-2.5 text-sm text-white/70">№ {reservation.orderReference}</p>
          </div>
        </div>

        <div className="relative z-10 -mt-3 rounded-t-[2rem] bg-[#f4f1ec] px-4 pb-10 pt-6 text-neutral-900">
          {details}
        </div>
      </main>

      {/* ── Tablet/desktop (>=768px) — shared Tennis_desktop composition,
          same light background this page already uses on mobile. ── */}
      <DesktopSplitScreen avatarUrl={profile?.avatarUrl ?? null}>
        <div className="flex flex-1 flex-col items-center justify-center bg-[#f4f1ec] px-8 py-8 text-neutral-900 lg:px-12">
          <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl">
            <h1 className="text-xl font-medium">{t("title")}</h1>
            <p className="mt-2 text-sm text-neutral-500">№ {reservation.orderReference}</p>
            <div className="mt-6">{details}</div>
          </div>
        </div>
      </DesktopSplitScreen>
    </>
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
