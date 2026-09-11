import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ARCHITECTURE.md §5: "Admin routes additionally check profile.role ===
// 'ADMIN'." Shared by every /api/admin/** route so the
// unauthenticated (401) vs. authenticated-non-admin (403) distinction
// can't drift between routes — each route still calls this itself
// (no shared middleware doing authorization on their behalf).
export async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = claimsData.claims.sub;
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return { userId };
}
