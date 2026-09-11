import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createCourtSchema } from "@/lib/validation/court";

// Admin-only view: every court regardless of isActive, unlike the public
// GET /api/courts (which is `where: { isActive: true }` and select-limited).
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const courts = await prisma.court.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ courts });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = createCourtSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, type, priceUah, isActive, sortOrder } = parsed.data;

  try {
    const court = await prisma.court.create({
      data: {
        name,
        type,
        priceUah,
        isActive: isActive ?? true,
        // Default to the end of the existing list rather than the schema's
        // literal column default (0), which would put every new court
        // first and visually reorder the real five courts on /home and
        // /reserve.
        sortOrder: sortOrder ?? (await nextSortOrder()),
      },
    });
    return NextResponse.json({ court }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "duplicate_name" }, { status: 409 });
    }
    throw err;
  }
}

async function nextSortOrder(): Promise<number> {
  const max = await prisma.court.aggregate({ _max: { sortOrder: true } });
  return (max._max.sortOrder ?? 0) + 1;
}
