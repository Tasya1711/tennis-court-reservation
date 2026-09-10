import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require a signed-in user. This is an *optimistic* check only
// (redirects obviously logged-out visitors before a page even renders) —
// it is not the real authorization boundary. Every API route re-checks the
// session itself; see ARCHITECTURE.md §5 and the Next.js Proxy docs' own
// warning against relying on Proxy for authorization.
const PROTECTED_PREFIXES = [
  "/home",
  "/onboarding",
  "/reserve",
  "/payment",
  "/account",
  "/admin",
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refreshes the token if needed and validates it — do not remove this
  // call even though its return value isn't used directly below; skipping
  // it means the session cookie never gets refreshed.
  const { data } = await supabase.auth.getClaims();

  const isProtected = PROTECTED_PREFIXES.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );
  if (isProtected && !data?.claims) {
    const redirectUrl = new URL("/auth", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
