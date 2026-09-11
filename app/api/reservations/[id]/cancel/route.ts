import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const idSchema = z.string().uuid();

// ARCHITECTURE.md §7 step 5: only the owning user (or admin), only while
// CONFIRMED and before startAt; sets CANCELLED, which also frees the slot
// (GET /api/courts/:id/availability only blocks on CONFIRMED / a still-live
// PENDING_PAYMENT, so a CANCELLED row is already excluded — no separate
// "free the slot" step is needed).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // A non-UUID id would otherwise reach the database driver and throw
  // (Reservation.id is @db.Uuid) — reject it the same way as "not found"
  // before it gets that far, rather than a 500.
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const reservation = await prisma.reservation.findUnique({ where: { id } });

  const isOwner = reservation?.userId === claimsData.claims.sub;
  let isAdmin = false;
  if (reservation && !isOwner) {
    const profile = await prisma.profile.findUnique({
      where: { id: claimsData.claims.sub },
      select: { role: true },
    });
    isAdmin = profile?.role === "ADMIN";
  }

  // Same 404 whether it doesn't exist or belongs to someone else — never
  // reveal that another user's reservation id is valid (matches GET
  // /api/reservations/[id]).
  if (!reservation || (!isOwner && !isAdmin)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isEligible = reservation.status === "CONFIRMED" && reservation.startAt.getTime() > Date.now();
  if (!isEligible) {
    return NextResponse.json({ error: "not_cancellable" }, { status: 409 });
  }

  // Guarded by the WHERE clause, not just the isEligible check above — the
  // same idempotency pattern as the payment webhooks, so a duplicate/racing
  // cancel request (or one that lost a race with a webhook or the M6 cron)
  // can't double-apply.
  const result = await prisma.reservation.updateMany({
    where: { id: reservation.id, status: "CONFIRMED" },
    data: { status: "CANCELLED" },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "not_cancellable" }, { status: 409 });
  }

  return NextResponse.json({ status: "CANCELLED" });
}
