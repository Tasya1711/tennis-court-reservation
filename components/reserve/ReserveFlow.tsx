"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getBookableDates, toKyivDateString } from "@/lib/reservations/availability";
import { DesktopSplitScreen } from "@/components/layout/DesktopSplitScreen";
import { BackButton } from "@/components/layout/BackButton";

type Court = { id: string; name: string; type: "INDOOR" | "OUTDOOR"; priceUah: number };
type Slot = { startTime: string; available: boolean };

function dayLabel(dateStr: string, weekdays: string[]) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return { weekday: weekdays[d.getUTCDay()], day: d.getUTCDate() };
}

// Display-only: renders a slot's start time as an "HH:00 - HH:00" range,
// matching the reference's pill labels. Purely presentational — the
// underlying slot data/logic is unchanged.
function slotRangeLabel(startTime: string) {
  const [h] = startTime.split(":").map(Number);
  const end = `${String(h + 1).padStart(2, "0")}:00`;
  return `${startTime} - ${end}`;
}

// Display-only: derives the reference's "Chestnut Av." style short label
// from the real venue address ("12 Chestnut Avenue") — strips the house
// number, abbreviates "Avenue"/"Street"/"Boulevard". Not a hardcoded court
// list — just a display transform of real venue data already in the DB.
function shortVenueLabel(address: string | null): string {
  if (!address) return "";
  return address
    .replace(/^\d+\s+/, "")
    .replace(/\bAvenue\b/i, "Av.")
    .replace(/\bStreet\b/i, "St.")
    .replace(/\bBoulevard\b/i, "Blvd.");
}

export function ReserveFlow({
  courts,
  avatarUrl,
  venueAddress,
}: {
  courts: Court[];
  avatarUrl: string | null;
  venueAddress: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("Reserve");
  const tCommon = useTranslations("Common");
  const weekdays = t.raw("weekdays") as string[];
  const dates = getBookableDates();

  const [courtId, setCourtId] = useState<string | null>(courts[0]?.id ?? null);
  const [date, setDate] = useState<string>(dates[0] ?? toKyivDateString(new Date()));
  const [startTime, setStartTime] = useState<string | null>(null);

  // Availability result is keyed by the (court, date) it was fetched for, so
  // "loading" and "stale selection" are derived from a key mismatch instead
  // of imperative setState calls at the top of the effect.
  const requestKey = `${courtId ?? ""}|${date}`;
  const [slotsResult, setSlotsResult] = useState<{
    key: string;
    slots: Slot[];
    error: string | null;
  }>({ key: "", slots: [], error: null });
  const loadingSlots = courtId !== null && slotsResult.key !== requestKey;

  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const selectedCourt = courts.find((c) => c.id === courtId) ?? null;
  const shortAddress = shortVenueLabel(venueAddress);

  // Reset the selected time whenever court/date changes — the documented
  // "adjusting state when a prop changes" pattern (render-time setState),
  // not an effect, so it can't cascade an extra render.
  const [lastKey, setLastKey] = useState(requestKey);
  if (requestKey !== lastKey) {
    setLastKey(requestKey);
    setStartTime(null);
  }

  useEffect(() => {
    if (!courtId) return;
    let cancelled = false;

    fetch(`/api/courts/${courtId}/availability?date=${date}`)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setSlotsResult({ key: requestKey, slots: data.slots, error: null });
      })
      .catch(() => {
        if (!cancelled) {
          setSlotsResult({
            key: requestKey,
            slots: [],
            error: t("loadFailed"),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [courtId, date, requestKey, t]);

  const slots = slotsResult.key === requestKey ? slotsResult.slots : [];
  const slotsError = slotsResult.key === requestKey ? slotsResult.error : null;

  async function handleBook() {
    if (!courtId || !startTime) return;
    setBooking(true);
    setBookingError(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courtId, date, startTime }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 403 && body.error === "guest_not_allowed") {
        // Guest sessions can view this page but not book — send them to the
        // existing auth flow rather than showing an inline error here.
        router.push("/auth");
        return;
      }
      if (res.status === 409) {
        setBookingError(t("slotTaken"));
        setStartTime(null);
        // Refresh availability so the now-taken slot shows as disabled.
        const refreshed = await fetch(`/api/courts/${courtId}/availability?date=${date}`).then((r) => r.json());
        setSlotsResult({ key: requestKey, slots: refreshed.slots, error: null });
        return;
      }
      if (!res.ok) {
        setBookingError(tCommon("genericError"));
        return;
      }

      router.push(`/reserve/summary?id=${body.reservation.id}`);
    } catch {
      setBookingError(tCommon("networkError"));
    } finally {
      setBooking(false);
    }
  }

  const courtPills = (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {courts.map((court) => (
        <button
          key={court.id}
          type="button"
          onClick={() => setCourtId(court.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition ${
            court.id === courtId ? "bg-lime-300 text-black" : "bg-black/35 text-white backdrop-blur-sm"
          }`}
        >
          {shortAddress ? `${shortAddress} ${court.name}` : court.name}
        </button>
      ))}
    </div>
  );

  const bookingForm = (
    <>
      <div className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-neutral-500">
        <CalendarIcon />
        <span>{t("chooseDateLabel")}</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {dates.map((d) => {
          const { weekday, day } = dayLabel(d, weekdays);
          const active = d === date;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDate(d)}
              className={`flex w-16 shrink-0 flex-col items-center rounded-xl py-2.5 transition ${
                active ? "border-2 border-neutral-900 bg-white" : "border-2 border-transparent bg-white/70"
              }`}
            >
              <span className="text-xl font-semibold text-neutral-900">{day}</span>
              <span className="mt-0.5 text-[11px] text-neutral-400">{weekday}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-3 mt-6 flex items-center gap-1.5 text-[13px] font-medium text-neutral-500">
        <ClockIcon />
        <span>{t("chooseTimeLabel")}</span>
      </div>
      {loadingSlots && <p className="text-sm text-neutral-400">{tCommon("loading")}</p>}
      {slotsError && <p className="text-sm text-red-600">{slotsError}</p>}
      {!loadingSlots && !slotsError && (
        <div className="grid grid-cols-2 gap-2.5">
          {slots.map((slot) => (
            <button
              key={slot.startTime}
              type="button"
              disabled={!slot.available}
              onClick={() => setStartTime(slot.startTime)}
              className={`rounded-xl py-3 text-sm font-medium transition ${
                !slot.available
                  ? "cursor-not-allowed bg-black/5 text-neutral-300 line-through"
                  : slot.startTime === startTime
                    ? "bg-neutral-900 text-white"
                    : "bg-black/5 text-neutral-700 active:scale-[0.97]"
              }`}
            >
              {slotRangeLabel(slot.startTime)}
            </button>
          ))}
        </div>
      )}

      {bookingError && <p className="mt-4 text-center text-sm text-red-600">{bookingError}</p>}

      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-[13px] text-neutral-500">{t("price")}</p>
          <p className="text-2xl font-bold text-neutral-900">
            {selectedCourt ? `${selectedCourt.priceUah} ₴` : "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleBook}
          disabled={!courtId || !startTime || booking}
          className="rounded-full bg-neutral-900 px-8 py-3.5 text-[15px] font-semibold text-white transition disabled:opacity-40"
        >
          {booking ? t("booking") : t("bookCta")}
        </button>
      </div>

      <p className="mt-4 text-center text-[11px] leading-snug text-neutral-400">
        {t("disclaimer")}
      </p>
    </>
  );

  return (
    <>
      {/* ── Mobile (<768px) — unchanged from the approved layout ── */}
      <main className="relative min-h-dvh overflow-hidden bg-[#f4f1ec] md:hidden">
        {/* Photo header — matches Tennis-Court-Reservation_template.jpeg's
            reservation-screen reference: avatar top-left, back button
            top-right, TENNIS / COURTS / RESERVATION wordmark, court pills. */}
        <div className="relative flex h-[46vh] min-h-[340px] w-full flex-col overflow-hidden px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-8">
          <Image src="/images/first-page_photo.jpeg" alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/55" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BackButton />
              <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white/80 shadow-lg">
                <Image
                  src={avatarUrl ?? "/images/user-photo.jpeg"}
                  alt=""
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <Link
              href="/home"
              aria-label={tCommon("home")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm"
            >
              <TennisBallIcon />
            </Link>
          </div>

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-xs font-medium tracking-[0.3em] text-[#f2c9a8]">TENNIS</p>
            <p className="text-[44px] font-black leading-none tracking-tight text-[#f2c9a8]">COURTS</p>
            <p className="mt-1 text-xs font-medium tracking-[0.3em] text-[#f2c9a8]">RESERVATION</p>
          </div>

          <div className="relative z-10">{courtPills}</div>
        </div>

        {/* White card — matches the reference's light booking-form panel. */}
        <div className="relative z-10 -mt-3 rounded-t-[2rem] bg-[#f4f1ec] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 text-neutral-900">
          {bookingForm}
        </div>
      </main>

      {/* ── Tablet/desktop (>=768px) — shared Tennis_desktop composition. ── */}
      <DesktopSplitScreen avatarUrl={avatarUrl}>
        <div className="relative flex flex-1 flex-col items-center bg-[#f4f1ec] px-8 py-8 text-neutral-900 lg:px-12">
          <div className="absolute left-6 top-6 lg:left-8 lg:top-8">
            <BackButton />
          </div>
          <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl">
            {courtPills}
            <div className="mt-6">{bookingForm}</div>
          </div>
        </div>
      </DesktopSplitScreen>
    </>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 6h15a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75V6.75A.75.75 0 0 1 4.5 6Z"
      />
    </svg>
  );
}

function TennisBallIcon() {
  // Matches the reference's top-right circular icon (a small tennis ball),
  // reused as the link back to /home — same "necessary navigation reuses
  // the reference's icon slot" pattern as M4's home-screen icon.
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" fill="#d9f477" />
      <path
        d="M12 3c-2.5 2.2-2.5 15.8 0 18M12 3c2.5 2.2 2.5 15.8 0 18"
        stroke="white"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="8.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
