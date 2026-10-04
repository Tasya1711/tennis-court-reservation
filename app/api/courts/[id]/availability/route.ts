import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSlotStatuses, isValidDateString } from "@/lib/reservations/availability";
import { blockingReservationsWhere } from "@/lib/reservations/first-available";

// Availability is always computed server-side from the database — the
// frontend never calculates it itself (ARCHITECTURE.md §7).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: courtId } = await params;
  const date = request.nextUrl.searchParams.get("date") ?? "";

  if (!isValidDateString(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court || !court.isActive) {
    return NextResponse.json({ error: "court_not_found" }, { status: 404 });
  }

  // A slot is unavailable if it's CONFIRMED, or still an unexpired
  // PENDING_PAYMENT hold. An expired-but-not-yet-swept PENDING_PAYMENT row
  // (the M6 cron hasn't run) is correctly treated as available here.
  const now = new Date();
  const blocking = await prisma.reservation.findMany({
    where: {
      courtId,
      date: new Date(`${date}T00:00:00.000Z`),
      ...blockingReservationsWhere(now),
    },
    select: { startTime: true },
  });
  const takenStartTimes = new Set(blocking.map((r) => r.startTime));

  // `status` distinguishes a slot someone holds ("taken") from one that has
  // simply already started ("past"), so the UI never presents elapsed time as
  // another customer's booking. POST /api/reservations rejects both anyway.
  const slots = getSlotStatuses(date, takenStartTimes, now.getTime()).map(({ startTime, status }) => ({
    startTime,
    available: status === "available",
    status,
  }));

  return NextResponse.json({ courtId, date, slots });
}
