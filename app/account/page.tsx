import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AccountScreen } from "@/components/account/AccountScreen";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/auth");
  }

  const userId = data.claims.sub;

  const [profile, reservations] = await Promise.all([
    prisma.profile.findUnique({ where: { id: userId } }),
    prisma.reservation.findMany({
      where: { userId },
      include: { court: { select: { name: true } } },
      orderBy: { startAt: "desc" },
    }),
  ]);

  return (
    <AccountScreen
      avatarUrl={profile?.avatarUrl ?? null}
      username={profile?.username ?? ""}
      email={data.claims.email ?? ""}
      reservations={reservations.map((r) => ({
        id: r.id,
        courtName: r.court.name,
        date: r.date.toISOString().slice(0, 10),
        startTime: r.startTime,
        endTime: r.endTime,
        amountUah: r.amountUah,
        orderReference: r.orderReference,
        status: r.status,
        paymentStatus: r.paymentStatus,
        startAtIso: r.startAt.toISOString(),
      }))}
    />
  );
}
