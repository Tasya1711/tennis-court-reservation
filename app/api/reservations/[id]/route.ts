import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { court: { select: { name: true, type: true } } },
  });

  // Same 404 whether it doesn't exist or belongs to someone else — never
  // reveal that another user's reservation id is valid.
  if (!reservation || reservation.userId !== claimsData.claims.sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ reservation });
}
