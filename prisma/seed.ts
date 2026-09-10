import { CourtType } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Matches Tennis-Court-Reservation_template.jpeg exactly: the reference's
// own "A,C Indoor / B Outdoor" legend gives the type mapping directly.
// sortOrder matches the reference grid's reading order (top row: B1, B2 —
// then bottom row: A1, C1, B3), which the /home grid renders sequentially.
const COURTS = [
  { name: "B1", type: CourtType.OUTDOOR, priceUah: 500, sortOrder: 1 },
  { name: "B2", type: CourtType.OUTDOOR, priceUah: 500, sortOrder: 2 },
  { name: "A1", type: CourtType.INDOOR, priceUah: 500, sortOrder: 3 },
  { name: "C1", type: CourtType.INDOOR, priceUah: 500, sortOrder: 4 },
  { name: "B3", type: CourtType.OUTDOOR, priceUah: 500, sortOrder: 5 },
];

const VENUE = {
  id: "main",
  name: "Tennis Court",
  address: "12 Chestnut Avenue",
};

async function main() {
  // Replace the earlier Court 1/2/3 placeholder data with the reference's
  // actual court names — no reservations exist yet to reference them.
  await prisma.court.deleteMany({ where: { name: { notIn: COURTS.map((c) => c.name) } } });

  for (const court of COURTS) {
    await prisma.court.upsert({
      where: { name: court.name },
      update: { type: court.type, sortOrder: court.sortOrder },
      create: court,
    });
  }
  await prisma.venue.upsert({
    where: { id: VENUE.id },
    update: { name: VENUE.name, address: VENUE.address },
    create: VENUE,
  });

  const count = await prisma.court.count();
  console.log(`Seed complete. ${count} court(s), venue row set.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
