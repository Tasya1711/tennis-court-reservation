import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AdminCourtsScreen } from "@/components/admin/AdminCourtsScreen";

export default async function AdminCourtsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/auth");
  }

  const profile = await prisma.profile.findUnique({ where: { id: data.claims.sub }, select: { role: true } });
  // Same non-revealing principle as the rest of the app (e.g. cancelling
  // another user's reservation): a logged-in non-admin gets the ordinary
  // 404 page, not a "you're not allowed" screen that confirms this route
  // exists and does something.
  if (profile?.role !== "ADMIN") {
    notFound();
  }

  const courts = await prisma.court.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <AdminCourtsScreen
      courts={courts.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        priceUah: c.priceUah,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
      }))}
    />
  );
}
