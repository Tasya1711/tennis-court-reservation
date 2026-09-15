import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/payments/stripe";

// NEXT_PUBLIC_SITE_URL alone breaks the redirect back from Stripe whenever
// the page wasn't loaded from that exact origin — e.g. testing from a phone
// via the dev machine's LAN IP, where the env var still says "localhost"
// but the phone can't resolve "localhost" back to that machine. The
// request's own Origin/Host reflects whatever origin the browser is
// actually on, so it's preferred; NEXT_PUBLIC_SITE_URL remains the
// fallback for contexts with no request origin to read.
function resolveSiteUrl(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const host = request.headers.get("host");
  if (host) {
    const isLocal = host.startsWith("localhost") || /^\d+\.\d+\.\d+\.\d+(:\d+)?$/.test(host);
    const proto = request.headers.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? null;
}

// Mirrors /api/payments/create's validation exactly (same reservation
// architecture, different provider underneath) — auth, ownership, status,
// and hold-expiry checks are unchanged from the WayForPay route.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const reservationId = typeof body?.reservationId === "string" ? body.reservationId : null;
  if (!reservationId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { court: { select: { name: true } } },
  });

  if (!reservation || reservation.userId !== claimsData.claims.sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (reservation.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "not_payable" }, { status: 409 });
  }
  if (reservation.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "hold_expired" }, { status: 410 });
  }

  const siteUrl = resolveSiteUrl(request);
  if (!process.env.STRIPE_SECRET_KEY || !siteUrl) {
    console.error("payments/stripe/checkout: missing Stripe/site env configuration");
    return NextResponse.json({ error: "payment_not_configured" }, { status: 503 });
  }

  const productName = `${reservation.court.name} · ${reservation.date.toISOString().slice(0, 10)} ${reservation.startTime}-${reservation.endTime}`;

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // This is a digital court reservation — nothing ships, and every
      // customer pays in UAH already, so there's no currency to localize.
      // The Dashboard's Adaptive Pricing default was silently inheriting
      // as {enabled: true} on every session (confirmed via the Stripe API)
      // even though we never set it — its presence is the only
      // unexplained, non-default field found on Apple Pay's stuck
      // "Update shipping…" sessions, so it's turned off explicitly here.
      adaptive_pricing: { enabled: false },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "uah",
            unit_amount: reservation.amountUah * 100, // UAH is a 2-decimal currency
            product_data: { name: productName },
          },
        },
      ],
      // client_reference_id + metadata both carry the link back to our
      // reservation — belt and suspenders, since metadata is the field the
      // webhook actually trusts (ARCHITECTURE.md-style defense in depth).
      client_reference_id: reservation.orderReference,
      metadata: { reservationId: reservation.id, orderReference: reservation.orderReference },
      success_url: `${siteUrl}/reserve/summary?id=${reservation.id}`,
      cancel_url: `${siteUrl}/reserve/summary?id=${reservation.id}`,
    });

    if (!session.url) {
      console.error("payments/stripe/checkout: Stripe session created without a url", session.id);
      return NextResponse.json({ error: "stripe_no_url" }, { status: 502 });
    }

    return NextResponse.json({ paymentUrl: session.url });
  } catch (err) {
    console.error("payments/stripe/checkout: Stripe rejected the session request", err);
    return NextResponse.json({ error: "stripe_rejected" }, { status: 502 });
  }
}
