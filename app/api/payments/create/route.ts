import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { signPurchaseRequest } from "@/lib/payments/wayforpay";

const WAYFORPAY_PAY_URL = "https://secure.wayforpay.com/pay?behavior=offline";

// Builds and signs a real WayForPay purchase request server-side (the
// secret key never reaches the browser) and returns the hosted checkout
// URL WayForPay itself issued — we don't construct that URL ourselves.
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

  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT;
  const merchantDomainName = process.env.WAYFORPAY_MERCHANT_DOMAIN_NAME;
  const secretKey = process.env.WAYFORPAY_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!merchantAccount || !merchantDomainName || !secretKey || !siteUrl) {
    // Fails loudly and server-side only — never silently "succeeds" with a
    // fake URL. See ARCHITECTURE.md §13 / the M7 report for exactly which
    // env var is missing in this environment.
    console.error("payments/create: missing WayForPay/site env configuration");
    return NextResponse.json({ error: "payment_not_configured" }, { status: 503 });
  }

  // Stable across repeated calls for the same reservation (e.g. the user
  // retries payment) rather than Date.now(), which would differ each time.
  const orderDate = Math.floor(reservation.createdAt.getTime() / 1000);
  const productName = [`${reservation.court.name} · ${reservation.date.toISOString().slice(0, 10)} ${reservation.startTime}-${reservation.endTime}`];
  const productCount = [1];
  const productPrice = [reservation.amountUah];

  const merchantSignature = signPurchaseRequest(secretKey, {
    merchantAccount,
    merchantDomainName,
    orderReference: reservation.orderReference,
    orderDate,
    amount: reservation.amountUah,
    currency: "UAH",
    productName,
    productCount,
    productPrice,
  });

  const formBody = new URLSearchParams();
  formBody.set("transactionType", "CREATE_INVOICE");
  formBody.set("merchantAccount", merchantAccount);
  formBody.set("merchantAuthType", "SimpleSignature");
  formBody.set("merchantDomainName", merchantDomainName);
  formBody.set("merchantSignature", merchantSignature);
  formBody.set("apiVersion", "1");
  formBody.set("language", "UA");
  formBody.set("serviceUrl", `${siteUrl}/api/payments/webhook`);
  formBody.set("returnUrl", `${siteUrl}/reserve/summary?id=${reservation.id}`);
  formBody.set("orderReference", reservation.orderReference);
  formBody.set("orderDate", String(orderDate));
  formBody.set("amount", String(reservation.amountUah));
  formBody.set("currency", "UAH");
  for (const name of productName) formBody.append("productName[]", name);
  for (const count of productCount) formBody.append("productCount[]", String(count));
  for (const price of productPrice) formBody.append("productPrice[]", String(price));

  let wfpResponse: Response;
  try {
    wfpResponse = await fetch(WAYFORPAY_PAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    });
  } catch {
    return NextResponse.json({ error: "wayforpay_unreachable" }, { status: 502 });
  }

  const wfpBody = await wfpResponse.json().catch(() => null);
  if (!wfpResponse.ok || !wfpBody?.url) {
    console.error("payments/create: WayForPay rejected the purchase request", wfpBody);
    return NextResponse.json({ error: "wayforpay_rejected", detail: wfpBody?.reason ?? null }, { status: 502 });
  }

  return NextResponse.json({ paymentUrl: wfpBody.url });
}
