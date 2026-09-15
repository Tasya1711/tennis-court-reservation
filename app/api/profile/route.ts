import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { usernameSchema } from "@/lib/validation/auth";

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

// Edit-profile: nickname only. Avatar changes go through the existing
// POST /api/profile/avatar (which already supports re-upload/replace — see
// its own comments). Email and password are never editable here or
// anywhere else — changing either would require re-verifying the Supabase
// Auth identity itself, which is out of scope for this endpoint.
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = data.claims.sub;

  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  if (profile?.role === "GUEST") {
    return NextResponse.json({ error: "guest_not_allowed" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = usernameSchema.safeParse(body?.username);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_username" }, { status: 400 });
  }

  const existing = await prisma.profile.findUnique({
    where: { username: parsed.data },
    select: { id: true },
  });
  if (existing && existing.id !== userId) {
    return NextResponse.json({ error: "username_taken" }, { status: 409 });
  }

  const updated = await prisma.profile.update({
    where: { id: userId },
    data: { username: parsed.data },
    select: { username: true, avatarUrl: true },
  });

  return NextResponse.json(updated);
}
