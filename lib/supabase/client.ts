import { createBrowserClient } from "@supabase/ssr";

// For use in Client Components only (registration/login forms, avatar
// upload widget). Server-side code should use lib/supabase/server.ts instead
// — see ARCHITECTURE.md §5.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
