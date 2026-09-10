import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` — same
// execution model, new name/export. See ARCHITECTURE.md §5.
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimization, and common metadata files —
    // otherwise Proxy runs (and touches cookies) on every asset request.
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};
