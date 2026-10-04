import { fromZonedTime } from "date-fns-tz";

// All reservation timing is anchored to Europe/Kyiv — never the server's or
// a request's local timezone (ARCHITECTURE.md §7).
export const TIMEZONE = "Europe/Kyiv";
export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 22; // last bookable slot starts at 21:00, ends 22:00
export const SLOT_HOLD_MINUTES = 10;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const d = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime());
}

// The 1-hour slot start times within operating hours, e.g. ["08:00", ..., "21:00"].
export function getSlotStartTimes(): string[] {
  const times: string[] = [];
  for (let h = OPENING_HOUR; h < CLOSING_HOUR; h++) {
    times.push(`${String(h).padStart(2, "0")}:00`);
  }
  return times;
}

// "Today" and the bookable date range, anchored to Kyiv's calendar date —
// not the browser's or server's local date, which could already be
// tomorrow (or still yesterday) in Kyiv near midnight.
const kyivDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toKyivDateString(instant: Date): string {
  return kyivDateFormatter.format(instant); // en-CA locale formats as YYYY-MM-DD
}

export function getBookableDates(days = 14, now = Date.now()): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(toKyivDateString(new Date(now + i * 24 * 60 * 60 * 1000)));
  }
  return dates;
}

// Converts a Kyiv wall-clock (date, "HH:00") into the canonical UTC instants
// stored on Reservation.startAt/endAt — the DST-safe conversion this whole
// design depends on (a fixed UTC offset would be wrong half the year).
export function slotToUtcRange(date: string, startTime: string) {
  const [hour] = startTime.split(":").map(Number);
  const endTime = `${String(hour + 1).padStart(2, "0")}:00`;
  const startAt = fromZonedTime(`${date}T${startTime}:00`, TIMEZONE);
  const endAt = fromZonedTime(`${date}T${endTime}:00`, TIMEZONE);
  return { startAt, endAt, endTime };
}

// A slot is "past" once it has started (it can no longer be booked, but it was
// never taken by anyone), "taken" if a real CONFIRMED / unexpired-hold
// reservation blocks it, otherwise "available". Past wins over taken so the UI
// can drop elapsed slots instead of making them look booked by someone else.
export type SlotStatus = "available" | "taken" | "past";

export function getSlotStatuses(
  date: string,
  takenStartTimes: ReadonlySet<string>,
  nowMs: number,
): { startTime: string; status: SlotStatus }[] {
  return getSlotStartTimes().map((startTime) => {
    const { startAt } = slotToUtcRange(date, startTime);
    const status: SlotStatus =
      startAt.getTime() <= nowMs ? "past" : takenStartTimes.has(startTime) ? "taken" : "available";
    return { startTime, status };
  });
}

// The first date (in the given order) that still has at least one genuinely
// bookable slot, or null if none do. `takenByDate` maps a date to the start
// times blocked by real reservations on it — nothing is assumed free.
export function firstDateWithOpenSlot(
  dates: string[],
  takenByDate: ReadonlyMap<string, ReadonlySet<string>>,
  nowMs: number,
): string | null {
  const none: ReadonlySet<string> = new Set();
  for (const date of dates) {
    const statuses = getSlotStatuses(date, takenByDate.get(date) ?? none, nowMs);
    if (statuses.some((s) => s.status === "available")) return date;
  }
  return null;
}
