import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

// ARCHITECTURE.md §9: rate limiting via the AuthAttempt table (count
// attempts per hashed IP+identifier in a rolling window), not a new
// Redis/third-party vendor. One row per attempt, keyed by scope so the
// same table serves login, registration, and reservation creation without
// a schema change — the scope lives in the key string itself.
const WINDOW_MS = 15 * 60 * 1000;

// Generous on purpose — high enough that a real user mistyping a
// password, retrying a failed registration, or re-picking a taken slot
// never gets close, but low enough to stop a scripted brute-force loop.
const LIMITS = {
  login: 10,
  register: 5,
  reservation: 8,
} as const;

export type RateLimitScope = keyof typeof LIMITS;

// The IP itself is never stored — only its hash, combined with the
// per-scope identifier (email for auth, userId for reservations) — so an
// AuthAttempt row on its own reveals neither.
export function hashRateLimitKey(scope: RateLimitScope, ...parts: string[]): string {
  const digest = createHash("sha256")
    .update(parts.map((p) => p.trim().toLowerCase()).join("|"))
    .digest("hex");
  return `${scope}:${digest}`;
}

// `request.ip`/`geo` were removed from NextRequest in Next 15 — read the
// proxy-forwarded header directly, same pattern already used in
// app/api/payments/stripe/checkout/route.ts's resolveSiteUrl().
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function checkRateLimit(
  key: string,
  scope: RateLimitScope,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const limit = LIMITS[scope];
  const windowStart = new Date(Date.now() - WINDOW_MS);

  const recent = await prisma.authAttempt.findMany({
    where: { key, createdAt: { gte: windowStart } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  if (recent.length >= limit) {
    const retryAfterMs = recent[0].createdAt.getTime() + WINDOW_MS - Date.now();
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  // Record this attempt unconditionally, before the caller knows whether
  // the underlying action itself will succeed — the count reflects
  // attempts, not failures, exactly like the architecture doc describes,
  // and the generous limits above mean that doesn't cost real users
  // anything in practice.
  await prisma.authAttempt.create({ data: { key } });
  return { allowed: true, retryAfterSeconds: 0 };
}
