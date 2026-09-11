import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/payments/stripe";

// Public endpoint — Stripe calls this server-to-server, no user session
// exists. The ONLY thing that authorizes a status change here is a valid
// Stripe-Signature verified against STRIPE_WEBHOOK_SECRET (never the
// browser redirect to /reserve/summary). Separate, independent integration
// from /api/payments/webhook (WayForPay) — see lib/payments/provider.ts.
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("payments/stripe/webhook: STRIPE_WEBHOOK_SECRET not configured — rejecting all webhooks");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  // Stripe signature verification needs the exact raw request body — must
  // read it as text before any JSON parsing, or verification always fails.
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("payments/stripe/webhook: signature verification failed", (err as Error).message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  if (event.type !== "checkout.session.completed") {
    // We only subscribed our endpoint to this event type in the Stripe
    // dashboard/CLI, but handle unexpected deliveries gracefully rather
    // than erroring.
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const reservationId = session.metadata?.reservationId;
  const orderReference = session.metadata?.orderReference;

  if (!reservationId || !orderReference) {
    console.error("payments/stripe/webhook: session missing our metadata", session.id);
    return NextResponse.json({ error: "missing_metadata" }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation || reservation.orderReference !== orderReference) {
    console.error("payments/stripe/webhook: no matching reservation", reservationId, orderReference);
    return NextResponse.json({ error: "unknown_order" }, { status: 404 });
  }

  // Defense in depth beyond the signature: what Stripe says was actually
  // charged must match what we expected to charge, in the currency we
  // expected — same principle as the WayForPay webhook.
  const expectedMinorUnits = reservation.amountUah * 100;
  const amountMatches = session.amount_total === expectedMinorUnits;
  const currencyMatches = session.currency === "uah";
  const isPaid = session.payment_status === "paid";

  // Always log the raw delivery, whatever we decide to do with it — Stripe
  // can and does redeliver the same webhook.
  await prisma.payment.create({
    data: {
      reservationId: reservation.id,
      provider: "stripe",
      orderReference: reservation.orderReference,
      amountUah: Math.round((session.amount_total ?? 0) / 100),
      status: session.payment_status,
      rawPayload: JSON.parse(rawBody),
    },
  });

  if (isPaid && amountMatches && currencyMatches) {
    // Guarded by the WHERE clause, not just the JS check above — this is
    // what actually makes redelivery/duplicate webhooks idempotent.
    await prisma.reservation.updateMany({
      where: { id: reservation.id, status: "PENDING_PAYMENT" },
      data: { status: "CONFIRMED", paymentStatus: "PAID" },
    });
  } else if (!amountMatches || !currencyMatches) {
    console.error("payments/stripe/webhook: amount/currency mismatch, not confirming", {
      reservationId: reservation.id,
      expected: expectedMinorUnits,
      received: session.amount_total,
      currency: session.currency,
    });
  }
  // If isPaid is false (e.g. an async payment method still processing),
  // leave the reservation as PENDING_PAYMENT — the M6 expiry logic (and
  // the lazy per-slot expiry in reservation creation) already handles an
  // abandoned hold; we don't need to explicitly fail it here on every
  // possible non-paid session state.

  return NextResponse.json({ received: true });
}
