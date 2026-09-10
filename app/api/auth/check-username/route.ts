import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { usernameSchema } from "@/lib/validation/auth";

// Public pre-flight check used during registration, so a taken username
// fails fast with a clean message instead of surfacing as a generic
// "Database error saving new user" from the on_auth_user_created trigger
// (which would otherwise be the only signal — see ARCHITECTURE.md §5).
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username") ?? "";
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) {
    return NextResponse.json({ available: false, reason: "invalid" }, { status: 200 });
  }

  const existing = await prisma.profile.findUnique({
    where: { username: parsed.data },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}
