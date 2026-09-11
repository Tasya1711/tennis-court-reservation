import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Used by the client-side poller on /reserve/summary — never trusts the
// WayForPay browser redirect itself, only what's actually in the database
// (which only the webhook, not this route, is allowed to change).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderReference: string }> },
) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { orderReference } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { orderReference },
    select: { id: true, userId: true, status: true, paymentStatus: true },
  });

  if (!reservation || reservation.userId !== claimsData.claims.sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    reservationId: reservation.id,
    status: reservation.status,
    paymentStatus: reservation.paymentStatus,
  });
}
