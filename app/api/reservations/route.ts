import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createReservationSchema } from "@/lib/validation/reservation";
import { SLOT_HOLD_MINUTES, slotToUtcRange } from "@/lib/reservations/availability";

// Creates a PENDING_PAYMENT hold. The database — a partial unique index on
// (court_id, start_at) for active statuses — is the actual source of truth
// against double booking, not this check-then-insert logic (which only
// exists to fail fast with a clean error before hitting that constraint).
// See ARCHITECTURE.md §7.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = claimsData.claims.sub;

  const body = await request.json().catch(() => null);
  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { courtId, date, startTime } = parsed.data;

  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court || !court.isActive) {
    return NextResponse.json({ error: "court_not_found" }, { status: 404 });
  }

  const { startAt, endAt, endTime } = slotToUtcRange(date, startTime);

  if (startAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "slot_in_past" }, { status: 400 });
  }

  // Lazy-expire a stale hold for this exact slot before inserting — stands
  // in for the M6 cron sweep, which doesn't exist yet at this milestone, so
  // a slot whose previous hold already expired isn't wrongly blocked.
  await prisma.reservation.updateMany({
    where: { courtId, startAt, status: "PENDING_PAYMENT", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });

  try {
    const reservation = await prisma.reservation.create({
      data: {
        userId,
        courtId,
        date: new Date(`${date}T00:00:00.000Z`),
        startTime,
        endTime,
        startAt,
        endAt,
        amountUah: court.priceUah,
        orderReference: `TR-${randomUUID()}`,
        expiresAt: new Date(Date.now() + SLOT_HOLD_MINUTES * 60 * 1000),
      },
    });
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
    }
    throw err;
  }
}

function isUniqueConstraintViolation(err: unknown): boolean {
  const e = err as {
    code?: string;
    meta?: { driverAdapterError?: { cause?: { code?: string; name?: string } } };
  };
  // Prisma's own known-error code for a unique constraint it's aware of...
  if (e?.code === "P2002") return true;
  // ...vs. this one, which the raw partial unique index (not in schema.prisma)
  // surfaces through the pg driver adapter instead. Postgres error 23505 is
  // unique_violation. See ARCHITECTURE.md §7 and the M1 trigger-bug notes for
  // why this project verified the adapter's error shape empirically rather
  // than assuming it matches older Prisma versions.
  const adapterCause = e?.meta?.driverAdapterError?.cause;
  return adapterCause?.code === "23505" || adapterCause?.name === "UniqueConstraintViolation";
}
