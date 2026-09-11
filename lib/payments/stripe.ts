import "server-only";
import Stripe from "stripe";

// Separate, independent integration from lib/payments/wayforpay.ts — see
// lib/payments/provider.ts for how the app picks which one is active.
// Server-only: the secret key never reaches the browser, and this module
// is never imported from a client component.
let cached: Stripe | undefined;

export function getStripeClient(): Stripe {
  if (cached) return cached;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  cached = new Stripe(secretKey);
  return cached;
}
