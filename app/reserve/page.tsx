import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ReserveFlow } from "@/components/reserve/ReserveFlow";
import { getFirstAvailableDates } from "@/lib/reservations/first-available";

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

  // The first day with a genuinely free slot per court, so the page opens on
  // something bookable (e.g. tomorrow once today's last slot has started).
  const firstAvailableDates = await getFirstAvailableDates(courts.map((c) => c.id));

  return (
    <ReserveFlow
      courts={courts}
      firstAvailableDates={firstAvailableDates}
      avatarUrl={profile?.avatarUrl ?? null}
      venueAddress={venue?.address ?? null}
    />
  );
}
