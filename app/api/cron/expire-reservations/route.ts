import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Vercel invokes cron jobs via GET, sending "Authorization: Bearer
// $CRON_SECRET" automatically when that env var exists
// (https://vercel.com/docs/cron-jobs/manage-cron-jobs) — this route only
// accepts that. Not reachable by ordinary users.
//
// This is a housekeeping sweep, not what actually keeps booking correct —
// availability (GET /api/courts/:id/availability) already excludes any
// PENDING_PAYMENT row whose expiresAt has passed regardless of whether this
// has run, and POST /api/reservations lazily expires the *specific* slot
// it's about to insert into before doing so. This route just keeps the
// `status` column itself accurate across every row (for the account page,
// a future admin view, etc.), and is naturally idempotent — running it
// twice, or missing a run, has the same end state either way.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await prisma.reservation.updateMany({
    where: { status: "PENDING_PAYMENT", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });

  return NextResponse.json({ expired: result.count });
}
