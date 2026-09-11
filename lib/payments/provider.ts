// Which payment provider the current UI flow uses. WayForPay
// (lib/payments/wayforpay.ts, /api/payments/create, /api/payments/webhook)
// is kept fully intact as a separate, independent integration for when
// real Ukrainian merchant credentials exist — it is not called by the
// active flow right now, but nothing about it is removed or renamed.
//
// Stripe (lib/payments/stripe.ts, /api/payments/stripe/*) is the active
// provider for this portfolio build, since a real WayForPay merchant
// account isn't available. Both providers return the same
// `{ paymentUrl: string }` shape from their checkout-creation route, so
// the frontend (PayButton) doesn't need to know which one is active
// beyond this single constant.
export const ACTIVE_PAYMENT_PROVIDER: "stripe" | "wayforpay" =
  (process.env.NEXT_PUBLIC_ACTIVE_PAYMENT_PROVIDER as "stripe" | "wayforpay" | undefined) ?? "stripe";

export const PAYMENT_CHECKOUT_ENDPOINTS: Record<"stripe" | "wayforpay", string> = {
  stripe: "/api/payments/stripe/checkout",
  wayforpay: "/api/payments/create",
};
