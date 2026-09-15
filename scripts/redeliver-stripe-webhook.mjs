// Local-dev fallback for a real, observed gap in this project's Stripe CLI
// environment: `stripe listen` reliably forwards synthetic `stripe trigger`
// events, but was found to silently miss `checkout.session.completed`
// events from genuine hosted-Checkout-page completions (confirmed via
// Stripe's own /v1/events log — the event always exists on Stripe's side,
// it just never arrives locally). This script does not fabricate or bypass
// anything: it fetches the real, Stripe-confirmed event for a real payment
// and replays it through the exact same signature-verified path
// app/api/payments/stripe/webhook/route.ts already expects from Stripe
// itself, using the account's own STRIPE_WEBHOOK_SECRET.
//
// Usage:
//   npm run stripe:redeliver                  # latest checkout.session.completed
//   npm run stripe:redeliver -- <event_id>     # a specific event

import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

if (!secretKey || !webhookSecret) {
  console.error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET — run via `npm run stripe:redeliver`.");
  process.exit(1);
}

const stripe = new Stripe(secretKey);
const eventId = process.argv[2];

const event = eventId
  ? await stripe.events.retrieve(eventId)
  : await stripe.events
      .list({ type: "checkout.session.completed", limit: 1 })
      .then((list) => list.data[0]);

if (!event) {
  console.error("No checkout.session.completed event found on this account yet.");
  process.exit(1);
}

const payload = JSON.stringify(event);
const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });

const res = await fetch(`${siteUrl}/api/payments/stripe/webhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Stripe-Signature": signature },
  body: payload,
});

console.log(`Redelivered ${event.id} → ${res.status} ${await res.text()}`);
