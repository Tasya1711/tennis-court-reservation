import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Acts as the "auth/me" endpoint (ARCHITECTURE.md §5): merges the Supabase
// Auth session with our own Profile row. Session check happens here, in
// the route handler — not left to proxy.ts, which only does an optimistic
// redirect (ARCHITECTURE.md §5, §9).
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = data.claims.sub;
  const profile = await prisma.profile.findUnique({ where: { id: userId } });

  if (!profile) {
    // Should be impossible — the on_auth_user_created trigger creates this
    // row atomically with the auth.users row — but fail clearly if it ever is.
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: profile.id,
    email: data.claims.email,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
    createdAt: profile.createdAt,
  });
}
