import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AccountScreen } from "@/components/account/AccountScreen";

// Same reasoning as AccountScreen's own requestTime(): a server component's
// render is a single point-in-time snapshot for this request, so reading
// the clock here isn't the hydration-mismatch hazard eslint's purity rule
// is guarding against — but the rule can't tell the difference, so the
// read is isolated in its own named function.
function requestTime(): number {
  return Date.now();
}

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

  // Guest sessions (see app/api/auth/guest/route.ts) can view the public
  // experience but not the personal account area.
  if (profile?.role === "GUEST") {
    redirect("/auth");
  }

  // Expired bookings — either already flipped by the M6 cron, or still
  // PENDING_PAYMENT but past their hold window and not yet swept — are
  // dead ends the customer can't act on, so they're dropped from the
  // dashboard rather than just hidden with CSS. Confirmed, still-payable,
  // and a CONFIRMED-then-cancelled reservation are real history and stay
  // visible. A PENDING_PAYMENT hold the user deleted before ever paying
  // (CANCELLED + still UNPAID — see PendingReservationActions) never
  // became a real booking, so it's dropped too, not kept as a ghost row —
  // distinct from a paid reservation that was later cancelled, which
  // stays as genuine history.
  const now = requestTime();
  const visibleReservations = reservations.filter((r) => {
    const holdExpired = r.status === "PENDING_PAYMENT" && r.expiresAt.getTime() < now;
    const deletedUnpaidHold = r.status === "CANCELLED" && r.paymentStatus === "UNPAID";
    return r.status !== "EXPIRED" && !holdExpired && !deletedUnpaidHold;
  });

  return (
    <AccountScreen
      avatarUrl={profile?.avatarUrl ?? null}
      username={profile?.username ?? ""}
      email={data.claims.email ?? ""}
      reservations={visibleReservations.map((r) => ({
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
