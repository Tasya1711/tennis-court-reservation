import { createBrowserClient } from "@supabase/ssr";

// For use in Client Components only (registration/login forms, avatar
// upload widget). Server-side code should use lib/supabase/server.ts instead
// — see ARCHITECTURE.md §5.
//
// cookieOptions: SameSite=None (+ Secure, which None requires) so the
// session cookie set here — e.g. by the guest flow's client-side
// verifyOtp() call — isn't dropped when this app is embedded in a
// cross-site iframe. Browsers reject a `SameSite=None` cookie without
// `Secure`, so the two must always be set together. Must match
// lib/supabase/server.ts and lib/supabase/proxy.ts.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { sameSite: "none", secure: true },
    },
  );
}
