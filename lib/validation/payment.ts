import { z } from "zod";

// `amount` is documented as numeric, but WayForPay (like many payment
// gateways) has been known to send numeric fields as strings in some SDK
// versions — coerce rather than reject, since the actual value (not its
// JSON type) is what the signature and reservation match are checked
// against.
const numericField = z.union([z.number(), z.string()]).transform((v) => (typeof v === "string" ? Number(v) : v));

export const wayforpayWebhookSchema = z.object({
  merchantAccount: z.string(),
  orderReference: z.string(),
  amount: numericField,
  currency: z.string(),
  authCode: z.string().optional(),
  cardPan: z.string().optional(),
  transactionStatus: z.string(),
  reasonCode: z.union([z.number(), z.string()]).optional(),
  merchantSignature: z.string(),
});
