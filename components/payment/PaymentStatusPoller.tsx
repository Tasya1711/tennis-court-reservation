"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 48; // ~2 minutes

// Only actually polls once the referrer suggests we just came back from a
// hosted checkout page (WayForPay or Stripe) — before that (a first visit
// to the summary page, pay button not yet clicked) there's nothing to poll
// for. This is display-only: it doesn't gate anything trust-sensitive, it
// just avoids showing a "confirming payment" indicator before any payment
// exists, and avoids polling pointlessly. The actual confirmation truth
// always comes from the webhook-updated database, never this referrer
// check — it works identically regardless of which provider redirected
// the user back here.
const CHECKOUT_HOSTNAMES = ["wayforpay.com", "checkout.stripe.com"];

function cameFromCheckout(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const hostname = new URL(document.referrer || "").hostname;
    return CHECKOUT_HOSTNAMES.some((h) => hostname.endsWith(h));
  } catch {
    return false;
  }
}

export function PaymentStatusPoller({ orderReference }: { orderReference: string }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const pollCount = useRef(0);

  useEffect(() => {
    // document.referrer is a browser-only signal with no server-rendered
    // equivalent (SSR always sees `active: false`, matching the client's
    // very first hydration paint) — this has to run post-mount, there's no
    // way to know it during render without a hydration mismatch, which is
    // the actual hazard this lint rule exists to catch. That hazard
    // doesn't apply here since the SSR and first-client-paint output are
    // identical; only the render *after* this effect can differ, which is
    // the correct/unavoidable extra render for a client-only API check.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(cameFromCheckout());
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const interval = setInterval(async () => {
      if (cancelled) return;
      pollCount.current += 1;

      try {
        const res = await fetch(`/api/payments/${orderReference}/status`);
        if (!res.ok) return;
        const body = await res.json();

        if (body.status === "CONFIRMED") {
          cancelled = true;
          clearInterval(interval);
          router.push(`/payment/success?ref=${orderReference}`);
          return;
        }
        if (body.status !== "PENDING_PAYMENT") {
          // EXPIRED/CANCELLED — stop polling and let the server component
          // re-render with the real status.
          cancelled = true;
          clearInterval(interval);
          router.refresh();
          return;
        }
      } catch {
        // transient network error — just try again next tick
      }

      if (pollCount.current >= MAX_POLLS) {
        cancelled = true;
        clearInterval(interval);
        setGaveUp(true);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [active, orderReference, router]);

  if (!active) return null;

  if (gaveUp) {
    return (
      <p className="mt-3 text-center text-sm text-neutral-500">
        Підтвердження оплати займає більше часу, ніж очікувалось. Оновіть сторінку через хвилину.
      </p>
    );
  }

  return (
    <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm text-neutral-500">
      <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-400" />
      Підтверджуємо оплату…
    </p>
  );
}
