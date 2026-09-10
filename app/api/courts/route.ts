import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const courts = await prisma.court.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, type: true, priceUah: true },
  });
  return NextResponse.json({ courts });
}
