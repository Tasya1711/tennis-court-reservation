import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// For use in Server Components and Route Handlers. Reads/writes the auth
// session via Next.js's cookie store. The `setAll` write can fail when
// called from a Server Component (which can't set cookies) — that's fine
// here because proxy.ts (§ auth flow) already refreshes the session on
// every navigation, so Server Components only ever need to read it.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — ignore, proxy.ts handles it.
          }
        },
      },
    },
  );
}
