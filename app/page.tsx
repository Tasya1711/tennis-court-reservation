import { createClient } from "@/lib/supabase/server";
import { Intro } from "@/components/intro/Intro";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const destination = data?.claims ? "/home" : "/auth";

  // TEMP DEBUG — remove once the intro-skip bug is confirmed fixed.
  console.log("[INTRO DEBUG] app/page.tsx rendering LandingPage, destination =", destination);

  // The splash plays on every load/session, regardless of auth state —
  // only where it hands off to afterward differs.
  return <Intro destination={destination} />;
}
