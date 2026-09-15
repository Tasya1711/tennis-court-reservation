import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Real guest access, same Supabase Auth system as everyone else — not a
// second auth mechanism. supabase.auth.signInAnonymously() would be the
// natural fit, but this project's Supabase instance has "Anonymous
// sign-ins" disabled at the dashboard level (confirmed empirically:
// signInAnonymously() returns `anonymous_provider_disabled`, a project
// setting only togglable from the Supabase dashboard, not from code).
//
// This route creates a real user via the admin API's generateLink() —
// the same always-available "magic link" signup path, not gated by that
// toggle — and returns just enough for the browser to complete the
// sign-in itself via supabase.auth.verifyOtp(). The random password
// exists only to satisfy generateLink's required field for a `signup`
// link; it's generated fresh here, never stored beyond this request, and
// never sent to the client. `is_guest: true` in the metadata is read by
// the on_auth_user_created trigger (see the two guest-role migrations),
// which sets profiles.role = 'GUEST' instead of the default CUSTOMER —
// that's what /api/reservations and /account check to reject a guest.
export async function POST() {
  const admin = createAdminClient();

  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const email = `guest-${suffix}@guest.internal`;
  const password = randomUUID() + randomUUID();
  const username = `guest_${suffix.slice(0, 8)}`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { data: { username, is_guest: true } },
  });

  if (error || !data?.properties?.hashed_token) {
    console.error("auth/guest: generateLink failed", error);
    return NextResponse.json({ error: "guest_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ email, tokenHash: data.properties.hashed_token });
}
