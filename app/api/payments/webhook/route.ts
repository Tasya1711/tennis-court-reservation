import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAckResponse, verifyWebhookSignature } from "@/lib/payments/wayforpay";
import { wayforpayWebhookSchema } from "@/lib/validation/payment";

// Public endpoint — WayForPay calls this server-to-server, no user session
// exists. The ONLY thing that authorizes a status change here is a valid
// merchantSignature verified against WAYFORPAY_SECRET_KEY (never the
// browser redirect to /reserve/summary, which is not trusted for anything
// beyond letting the user know where to look). See ARCHITECTURE.md §8.
export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const parsed = wayforpayWebhookSchema.safeParse(rawBody);
  if (!parsed.success) {
    console.error("payments/webhook: malformed payload", parsed.error.flatten());
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const payload = parsed.data;

  const secretKey = process.env.WAYFORPAY_SECRET_KEY;
  if (!secretKey) {
    console.error("payments/webhook: WAYFORPAY_SECRET_KEY not configured — rejecting all webhooks");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const signatureValid = verifyWebhookSignature(secretKey, {
    merchantAccount: payload.merchantAccount,
    orderReference: payload.orderReference,
    amount: payload.amount,
    currency: payload.currency,
    authCode: payload.authCode,
    cardPan: payload.cardPan,
    transactionStatus: payload.transactionStatus,
    reasonCode: payload.reasonCode,
    merchantSignature: payload.merchantSignature,
  });

  if (!signatureValid) {
    // Deliberately no ack here — an invalid signature must never be able
    // to influence a reservation, and WayForPay's own retry-for-4-days
    // behavior means a *genuine* delivery with a transient issue gets
    // another chance; a forged one just keeps failing, which is correct.
    console.error("payments/webhook: signature verification failed", {
      orderReference: payload.orderReference,
    });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { orderReference: payload.orderReference },
  });

  if (!reservation) {
    console.error("payments/webhook: no reservation for orderReference", payload.orderReference);
    return NextResponse.json({ error: "unknown_order" }, { status: 404 });
  }

  // Defense in depth beyond the signature: the amount/currency WayForPay
  // reports must match what we actually charged for. A mismatch here
  // means something is wrong even with a validly-signed payload (e.g. a
  // signature collision across merchants would still fail this).
  const amountMatches = Math.abs(reservation.amountUah - payload.amount) < 0.01;
  const currencyMatches = payload.currency === "UAH";

  // Always keep the raw delivery as an audit row, whatever we decide to do
  // with it — WayForPay can and does redeliver the same webhook.
  await prisma.payment.create({
    data: {
      reservationId: reservation.id,
      provider: "wayforpay",
      orderReference: payload.orderReference,
      amountUah: Math.round(payload.amount),
      status: payload.transactionStatus,
      rawPayload: rawBody,
    },
  });

  if (amountMatches && currencyMatches && payload.transactionStatus === "Approved") {
    // Guarded by the WHERE clause, not just the JS check above — this is
    // what actually makes redelivery/duplicate webhooks idempotent:
    // updateMany only touches the row while it's still PENDING_PAYMENT, so
    // a second "Approved" delivery for an already-CONFIRMED reservation is
    // a no-op rather than re-applying the update.
    await prisma.reservation.updateMany({
      where: { id: reservation.id, status: "PENDING_PAYMENT" },
      data: { status: "CONFIRMED", paymentStatus: "PAID" },
    });
  } else if (!amountMatches || !currencyMatches) {
    console.error("payments/webhook: amount/currency mismatch, not confirming", {
      orderReference: payload.orderReference,
      expected: reservation.amountUah,
      received: payload.amount,
      currency: payload.currency,
    });
  } else {
    // Declined / Expired / Refunded / Voided / etc. — free the slot now
    // rather than waiting out the remaining hold.
    await prisma.reservation.updateMany({
      where: { id: reservation.id, status: "PENDING_PAYMENT" },
      data: { status: "EXPIRED", paymentStatus: "FAILED" },
    });
  }

  const time = Math.floor(Date.now() / 1000);
  const status = "accept";
  const signature = signAckResponse(secretKey, payload.orderReference, status, time);

  return NextResponse.json({ orderReference: payload.orderReference, status, time, signature });
}
