import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — full privileges, bypasses RLS. Only ever used from
// route handlers for operations that must run with elevated access (avatar
// upload to Storage). The `server-only` import makes any accidental client
// bundle reference a build-time error rather than a leaked secret.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
