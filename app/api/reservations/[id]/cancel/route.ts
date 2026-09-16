import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const idSchema = z.string().uuid();

// ARCHITECTURE.md §7 step 5: only the owning user (or admin), and only while
// either (a) CONFIRMED and before startAt, or (b) PENDING_PAYMENT and still
// within its hold window (expiresAt in the future — an already-expired hold
// is not user-cancellable here, it's EXPIRED by the M6 cron/lazy-expiry
// instead). Either branch sets CANCELLED, which also frees the slot (GET
// /api/courts/:id/availability only blocks on CONFIRMED / a still-live
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

  const now = Date.now();
  const isConfirmedCancellable = reservation.status === "CONFIRMED" && reservation.startAt.getTime() > now;
  const isPendingCancellable = reservation.status === "PENDING_PAYMENT" && reservation.expiresAt.getTime() > now;
  if (!isConfirmedCancellable && !isPendingCancellable) {
    return NextResponse.json({ error: "not_cancellable" }, { status: 409 });
  }

  // Guarded by the WHERE clause (matching whichever status made it
  // eligible above), not just the isEligible check — the same idempotency
  // pattern as the payment webhooks, so a duplicate/racing cancel request
  // (or one that lost a race with a webhook confirming payment, or the M6
  // cron expiring the hold) can't double-apply.
  const result = await prisma.reservation.updateMany({
    where: { id: reservation.id, status: reservation.status },
    data: { status: "CANCELLED" },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "not_cancellable" }, { status: 409 });
  }

  return NextResponse.json({ status: "CANCELLED" });
}
