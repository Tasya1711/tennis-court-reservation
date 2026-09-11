import "server-only";
import crypto from "node:crypto";

// All three signature shapes WayForPay uses, verified against their
// current developer docs (wiki.wayforpay.com) during implementation —
// not assumed from general knowledge. Each is HMAC_MD5 (hex) over a
// semicolon-joined field list, but the field lists differ per direction:
//
//   1. Purchase request (us -> WayForPay):
//      merchantAccount;merchantDomainName;orderReference;orderDate;amount;
//      currency;productName[];productCount[];productPrice[]
//   2. Webhook callback (WayForPay -> us), for verifying what they sent:
//      merchantAccount;orderReference;amount;currency;authCode;cardPan;
//      transactionStatus;reasonCode
//   3. Our ack response back to WayForPay:
//      orderReference;status;time

function hmacMd5(secretKey: string, value: string): string {
  return crypto.createHmac("md5", secretKey).update(value, "utf8").digest("hex");
}

export type PurchaseSignatureInput = {
  merchantAccount: string;
  merchantDomainName: string;
  orderReference: string;
  orderDate: number;
  amount: number;
  currency: string;
  productName: string[];
  productCount: number[];
  productPrice: number[];
};

export function signPurchaseRequest(secretKey: string, input: PurchaseSignatureInput): string {
  const parts = [
    input.merchantAccount,
    input.merchantDomainName,
    input.orderReference,
    String(input.orderDate),
    String(input.amount),
    input.currency,
    ...input.productName,
    ...input.productCount.map(String),
    ...input.productPrice.map(String),
  ];
  return hmacMd5(secretKey, parts.join(";"));
}

export type WebhookPayload = {
  merchantAccount: string;
  orderReference: string;
  amount: number;
  currency: string;
  authCode?: string;
  cardPan?: string;
  transactionStatus: string;
  reasonCode?: number | string;
  merchantSignature: string;
};

export function verifyWebhookSignature(secretKey: string, payload: WebhookPayload): boolean {
  const parts = [
    payload.merchantAccount ?? "",
    payload.orderReference ?? "",
    String(payload.amount ?? ""),
    payload.currency ?? "",
    payload.authCode ?? "",
    payload.cardPan ?? "",
    payload.transactionStatus ?? "",
    String(payload.reasonCode ?? ""),
  ];
  const expected = hmacMd5(secretKey, parts.join(";"));
  // Constant-time compare — a webhook signature check is exactly the kind
  // of comparison timing attacks target.
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(payload.merchantSignature ?? "", "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function signAckResponse(secretKey: string, orderReference: string, status: string, time: number): string {
  return hmacMd5(secretKey, [orderReference, status, String(time)].join(";"));
}
