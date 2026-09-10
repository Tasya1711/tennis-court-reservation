import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Intro } from "@/components/intro/Intro";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // A logged-in visitor shouldn't be shown the splash → login sequence
  // every time they open the app — send them straight to /home.
  if (data?.claims) {
    redirect("/home");
  }

  return <Intro />;
}
