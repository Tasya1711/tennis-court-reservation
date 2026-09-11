import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { updateCourtSchema } from "@/lib/validation/court";

const idSchema = z.string().uuid();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateCourtSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  // An empty PATCH body isn't a meaningful edit — reject rather than
  // silently no-op, matching zod's own "at least one field" expectation
  // for a partial update.
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  try {
    const court = await prisma.court.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ court });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      if (err.code === "P2002") {
        return NextResponse.json({ error: "duplicate_name" }, { status: 409 });
      }
    }
    throw err;
  }
}

// Deletion is only ever safe when nothing references the court — the
// Reservation.court relation is `onDelete: Restrict` precisely so a court
// with any reservation history (including old/cancelled/expired rows)
// can never be silently deleted out from under real data. Disabling
// (`PATCH { isActive: false }`) is the safe alternative for every other
// case, per ARCHITECTURE.md's own reasoning for that field.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const reservationCount = await prisma.reservation.count({ where: { courtId: id } });
  if (reservationCount > 0) {
    return NextResponse.json(
      { error: "has_reservations", message: "Court has reservation history — disable it instead of deleting." },
      { status: 409 },
    );
  }

  try {
    await prisma.court.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      // A reservation was created for this court in the race window
      // between the count check above and this delete — the database's
      // own Restrict constraint is the real backstop.
      if (err.code === "P2003") {
        return NextResponse.json({ error: "has_reservations" }, { status: 409 });
      }
    }
    throw err;
  }
}
