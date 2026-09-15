import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CancelReservationButton } from "@/components/account/CancelReservationButton";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DesktopSplitScreen } from "@/components/layout/DesktopSplitScreen";
import { BackButton } from "@/components/layout/BackButton";

type Reservation = {
  id: string;
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  amountUah: number;
  orderReference: string;
  status: string;
  paymentStatus: string;
  startAtIso: string;
};

// Same reasoning as app/reserve/summary/page.tsx's requestTime(): a
// server component's render is a single point-in-time snapshot for this
// request, so reading the clock here isn't the hydration-mismatch hazard
// eslint's purity rule guards against — but the rule can't tell the
// difference, so the read is isolated in its own named function and
// threaded down as a prop instead of called inside the mapped child.
function requestTime(): number {
  return Date.now();
}

export function AccountScreen({
  avatarUrl,
  username,
  email,
  reservations,
}: {
  avatarUrl: string | null;
  username: string;
  email: string;
  reservations: Reservation[];
}) {
  const t = useTranslations("Account");
  const tCommon = useTranslations("Common");
  const now = requestTime();

  const reservationsList =
    reservations.length === 0 ? (
      <div className="mt-4 rounded-2xl bg-black/[0.04] p-5 text-center">
        <p className="text-sm text-neutral-600">{t("noReservations")}</p>
        <Link href="/reserve" className="mt-3 inline-block text-sm font-medium text-neutral-900 underline">
          {t("bookCourt")}
        </Link>
      </div>
    ) : (
      <div className="mt-4 space-y-3">
        {reservations.map((r) => (
          <ReservationCard key={r.id} reservation={r} now={now} />
        ))}
      </div>
    );

  return (
    <>
      {/* ── Mobile (<768px) — unchanged from the approved layout ── */}
      <main className="relative min-h-dvh overflow-hidden bg-[#f4f1ec] md:hidden">
        {/* Same first-page_photo.jpeg header treatment as /reserve and
            /reserve/summary, for visual continuity. */}
        <div className="relative h-[30vh] min-h-[220px] w-full overflow-hidden px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
          <Image src="/images/first-page_photo.jpeg" alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/55" />

          <div className="relative z-10 flex items-center justify-between">
            <BackButton />
            <div className="flex items-center gap-2">
              <LogoutButton variant="icon" />
              <Link
                href="/home"
                aria-label={tCommon("home")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm"
              >
                <HomeIcon />
              </Link>
            </div>
          </div>

          <div className="relative z-10 mt-6 flex items-center gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white/80 shadow-lg">
              <Image
                src={avatarUrl ?? "/images/user-photo.jpeg"}
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-medium text-white">{username || t("defaultProfileName")}</h1>
                <Link
                  href="/account/edit"
                  aria-label={t("editAria")}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
                >
                  <EditIcon />
                </Link>
              </div>
              {email && <p className="text-sm text-white/70">{email}</p>}
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-6 rounded-t-[2rem] bg-[#f4f1ec] px-4 pb-10 pt-6 text-neutral-900">
          <p className="text-[15px] font-medium">{t("myReservations")}</p>
          {reservationsList}

          <Link
            href="/home"
            className="mt-8 block w-full rounded-full bg-neutral-900 py-4 text-center text-[15px] font-semibold text-white"
          >
            {tCommon("home")}
          </Link>
        </div>
      </main>

      {/* ── Tablet/desktop (>=768px) — shared Tennis_desktop composition,
          same light background this page already uses on mobile. ── */}
      <DesktopSplitScreen avatarUrl={avatarUrl}>
        <div className="flex flex-1 flex-col items-center bg-[#f4f1ec] px-8 py-8 text-neutral-900 lg:px-12">
          <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <BackButton />
                <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-black/10">
                  <Image
                    src={avatarUrl ?? "/images/user-photo.jpeg"}
                    alt=""
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-medium">{username || t("defaultProfileName")}</h1>
                    <Link
                      href="/account/edit"
                      aria-label={t("editAria")}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-neutral-600"
                    >
                      <EditIcon />
                    </Link>
                  </div>
                  {email && <p className="text-sm text-neutral-500">{email}</p>}
                </div>
              </div>
              <LogoutButton variant="icon" />
            </div>

            <p className="mt-8 text-[15px] font-medium">{t("myReservations")}</p>
            {reservationsList}
          </div>
        </div>
      </DesktopSplitScreen>
    </>
  );
}

function ReservationCard({ reservation, now }: { reservation: Reservation; now: number }) {
  const t = useTranslations("Account");
  const isCancellable = reservation.status === "CONFIRMED" && new Date(reservation.startAtIso).getTime() > now;

  const paymentStatusLabel: Record<string, string> = {
    UNPAID: t("paymentUnpaid"),
    PAID: t("paymentPaid"),
    REFUNDED: t("paymentRefunded"),
    FAILED: t("paymentFailed"),
  };

  return (
    <div className="rounded-2xl bg-black/[0.04] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-900">{reservation.courtName}</p>
          <p className="mt-0.5 text-xs text-neutral-500">№ {reservation.orderReference}</p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>

      <div className="mt-4 space-y-2">
        <Row label={t("date")} value={reservation.date} />
        <Row label={t("time")} value={`${reservation.startTime} – ${reservation.endTime}`} />
        <Row label={t("cost")} value={`${reservation.amountUah} ₴`} />
        <Row label={t("payment")} value={paymentStatusLabel[reservation.paymentStatus] ?? reservation.paymentStatus} />
      </div>

      {isCancellable && <CancelReservationButton reservationId={reservation.id} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("Account");
  const isPositive = status === "CONFIRMED";

  const statusLabel: Record<string, string> = {
    PENDING_PAYMENT: t("statusPending"),
    CONFIRMED: t("statusConfirmed"),
    CANCELLED: t("statusCancelled"),
    EXPIRED: t("statusExpired"),
  };

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        isPositive ? "bg-emerald-600/10 text-emerald-700" : "bg-black/[0.06] text-neutral-600"
      }`}
    >
      {statusLabel[status] ?? status}
    </span>
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

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="white" className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-3.5 w-3.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487 18.549 2.8a1.897 1.897 0 1 1 2.684 2.684L11.94 14.777a4.5 4.5 0 0 1-1.897 1.13L7.5 16.5l.593-2.542a4.5 4.5 0 0 1 1.13-1.897l7.639-7.574ZM19.5 13.5v4.905a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V6a2.25 2.25 0 0 1 2.25-2.25h4.5"
      />
    </svg>
  );
}
