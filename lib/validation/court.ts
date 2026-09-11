import { z } from "zod";

// Only fields that exist on the Court model and are meaningful for admin
// management — never id/createdAt/updatedAt/reservations.
export const createCourtSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(["INDOOR", "OUTDOOR"]),
  priceUah: z.number().int().positive(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// Same fields, all optional — PATCH only updates what's provided.
export const updateCourtSchema = createCourtSchema.partial();
