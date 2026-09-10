import { z } from "zod";
import { getSlotStartTimes, isValidDateString } from "@/lib/reservations/availability";

export const createReservationSchema = z.object({
  courtId: z.string().uuid(),
  date: z.string().refine(isValidDateString, "invalid date"),
  startTime: z.string().refine((t) => getSlotStartTimes().includes(t), "invalid start time"),
});
