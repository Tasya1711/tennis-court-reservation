import "server-only";
import { prisma } from "@/lib/prisma";
import { firstDateWithOpenSlot, getBookableDates } from "@/lib/reservations/availability";

// Same blocking rule as the availability route: CONFIRMED, or a PENDING_PAYMENT
// hold that hasn't expired yet. Shared so the two can't drift apart.
export function blockingReservationsWhere(now: Date) {
  return {
    OR: [
      { status: "CONFIRMED" as const },
      { status: "PENDING_PAYMENT" as const, expiresAt: { gt: now } },
    ],
  };
}

// For each court, the first bookable date that still has a free slot — one
// query for all courts and the whole bookable window. Used to open the
// reservation page on a day that actually has something to pick (e.g. tomorrow
// once today's last slot has started) without faking any availability.
export async function getFirstAvailableDates(
  courtIds: string[],
  now = new Date(),
): Promise<Record<string, string | null>> {
  const dates = getBookableDates(14, now.getTime());
  if (courtIds.length === 0) return {};

  const rows = await prisma.reservation.findMany({
    where: {
      courtId: { in: courtIds },
      date: {
        gte: new Date(`${dates[0]}T00:00:00.000Z`),
        lte: new Date(`${dates[dates.length - 1]}T00:00:00.000Z`),
      },
      ...blockingReservationsWhere(now),
    },
    select: { courtId: true, date: true, startTime: true },
  });

  const byCourt = new Map<string, Map<string, Set<string>>>();
  for (const r of rows) {
    const date = r.date.toISOString().slice(0, 10);
    const perDate = byCourt.get(r.courtId) ?? new Map<string, Set<string>>();
    const times = perDate.get(date) ?? new Set<string>();
    times.add(r.startTime);
    perDate.set(date, times);
    byCourt.set(r.courtId, perDate);
  }

  const result: Record<string, string | null> = {};
  for (const id of courtIds) {
    result[id] = firstDateWithOpenSlot(dates, byCourt.get(id) ?? new Map(), now.getTime());
  }
  return result;
}
