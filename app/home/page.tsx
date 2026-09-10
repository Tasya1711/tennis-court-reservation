import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { HomeScreen } from "@/components/home/HomeScreen";

// Real, server-enforced protected route — proxy.ts already redirects
// optimistically, but this is the actual authorization boundary
// (ARCHITECTURE.md §5, §9).
export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/auth");
  }

  const [profile, courts, venue] = await Promise.all([
    prisma.profile.findUnique({ where: { id: data.claims.sub } }),
    prisma.court.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.venue.findUnique({ where: { id: "main" } }),
  ]);

  return (
    <HomeScreen
      avatarUrl={profile?.avatarUrl ?? null}
      venue={venue ? { name: venue.name, address: venue.address } : null}
      courts={courts.map((c) => ({ id: c.id, name: c.name, type: c.type, priceUah: c.priceUah }))}
    />
  );
}
