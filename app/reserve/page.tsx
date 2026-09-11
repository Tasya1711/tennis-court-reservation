import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ReserveFlow } from "@/components/reserve/ReserveFlow";

export default async function ReservePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/auth");
  }

  const [courts, profile, venue] = await Promise.all([
    prisma.court.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, type: true, priceUah: true },
    }),
    prisma.profile.findUnique({ where: { id: data.claims.sub } }),
    prisma.venue.findUnique({ where: { id: "main" } }),
  ]);

  return (
    <ReserveFlow
      courts={courts}
      avatarUrl={profile?.avatarUrl ?? null}
      venueAddress={venue?.address ?? null}
    />
  );
}
