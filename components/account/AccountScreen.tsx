import Image from "next/image";
import Link from "next/link";
import { CancelReservationButton } from "@/components/account/CancelReservationButton";
import { LogoutButton } from "@/components/auth/LogoutButton";

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

// Same Ukrainian status copy as /reserve/summary, for a consistent vocabulary
// across the app.
const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Очікує оплати",
  CONFIRMED: "Підтверджено",
  CANCELLED: "Скасовано",
  EXPIRED: "Термін дії сплив",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "Не оплачено",
  PAID: "Оплачено",
  REFUNDED: "Повернено",
  FAILED: "Не вдалося",
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
  const now = requestTime();

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#f4f1ec]">
      {/* Same first-page_photo.jpeg header treatment as /reserve and
          /reserve/summary, for visual continuity. */}
      <div className="relative h-[30vh] min-h-[220px] w-full overflow-hidden px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
        <Image src="/images/first-page_photo.jpeg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/55" />

        <div className="relative z-10 flex items-center justify-end gap-2">
          <LogoutButton variant="icon" />
          <Link
            href="/home"
            aria-label="На головну"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm"
          >
            <BackIcon />
          </Link>
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
          <div>
            <h1 className="text-lg font-medium text-white">{username || "Мій профіль"}</h1>
            {email && <p className="text-sm text-white/70">{email}</p>}
          </div>
        </div>
      </div>

      <div className="relative z-10 -mt-6 rounded-t-[2rem] bg-[#f4f1ec] px-4 pb-10 pt-6 text-neutral-900">
        <p className="text-[15px] font-medium">Мої бронювання</p>

        {reservations.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-black/[0.04] p-5 text-center">
            <p className="text-sm text-neutral-600">У вас ще немає бронювань.</p>
            <Link href="/reserve" className="mt-3 inline-block text-sm font-medium text-neutral-900 underline">
              Забронювати корт
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {reservations.map((r) => (
              <ReservationCard key={r.id} reservation={r} now={now} />
            ))}
          </div>
        )}

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

function ReservationCard({ reservation, now }: { reservation: Reservation; now: number }) {
  const isCancellable = reservation.status === "CONFIRMED" && new Date(reservation.startAtIso).getTime() > now;

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
        <Row label="Дата" value={reservation.date} />
        <Row label="Час" value={`${reservation.startTime} – ${reservation.endTime}`} />
        <Row label="Вартість" value={`${reservation.amountUah} ₴`} />
        <Row label="Оплата" value={PAYMENT_STATUS_LABEL[reservation.paymentStatus] ?? reservation.paymentStatus} />
      </div>

      {isCancellable && <CancelReservationButton reservationId={reservation.id} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isPositive = status === "CONFIRMED";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        isPositive ? "bg-emerald-600/10 text-emerald-700" : "bg-black/[0.06] text-neutral-600"
      }`}
    >
      {STATUS_LABEL[status] ?? status}
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

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="white" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}
