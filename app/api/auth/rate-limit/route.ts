import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp, hashRateLimitKey } from "@/lib/rate-limit";

// Login and registration go straight from the browser to Supabase Auth's
// own SDK (ARCHITECTURE.md §3.1 — no custom login/register API routes),
// so there is no server checkpoint already sitting in front of those
// calls the way there is for reservation creation. AuthForm awaits this
// route first and only proceeds to call Supabase if it comes back
// allowed — the decision and the attempt count are both computed here,
// server-side, from real database state, not from anything the client
// reports about itself, so a user can't get past it by editing/disabling
// client-side JS. (A client that skips calling this endpoint entirely and
// talks to Supabase directly bypasses our app, not this check — that
// path is bounded by Supabase's own account-level Auth rate limiting,
// which is unrelated to and unaffected by this route.)
const bodySchema = z.object({
  scope: z.enum(["login", "register"]),
  email: z.string().trim().min(1).max(320),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { scope, email } = parsed.data;

  const key = hashRateLimitKey(scope, email, getClientIp(request));
  const result = await checkRateLimit(key, scope);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: result.retryAfterSeconds },
      { status: 429 },
    );
  }

  return NextResponse.json({ allowed: true });
}
