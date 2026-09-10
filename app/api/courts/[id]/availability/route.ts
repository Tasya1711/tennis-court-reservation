import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSlotStartTimes, isValidDateString, slotToUtcRange } from "@/lib/reservations/availability";

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
  const blocking = await prisma.reservation.findMany({
    where: {
      courtId,
      date: new Date(`${date}T00:00:00.000Z`),
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING_PAYMENT", expiresAt: { gt: new Date() } },
      ],
    },
    select: { startTime: true },
  });
  const takenStartTimes = new Set(blocking.map((r) => r.startTime));
  const now = Date.now();

  const slots = getSlotStartTimes().map((startTime) => {
    const { startAt } = slotToUtcRange(date, startTime);
    return {
      startTime,
      // A slot already blocked by another reservation, or one that's
      // already started (relevant for today — POST /api/reservations
      // rejects it either way, but the availability list should say so
      // upfront rather than let a user pick a slot that's already gone).
      available: !takenStartTimes.has(startTime) && startAt.getTime() > now,
    };
  });

  return NextResponse.json({ courtId, date, slots });
}
