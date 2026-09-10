import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { ALLOWED_AVATAR_MIME_TYPES, AVATAR_OUTPUT_SIZE, MAX_AVATAR_BYTES } from "@/lib/validation/avatar";

// Always operates on the CALLER's own session-derived id — there is no way
// to pass a target user id, so this endpoint cannot touch another user's
// avatar regardless of what a client sends (ARCHITECTURE.md §6).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = claimsData.claims.sub;

  const formData = await request.formData();
  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  // Fast pre-checks on the client-declared type/size — not trusted alone,
  // but reject obviously wrong input before doing any work.
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // The real validation: attempt to actually decode and re-encode the file.
  // A spoofed extension/Content-Type fails here regardless of what the
  // client claimed. sharp also strips EXIF/metadata by default (no
  // location data etc. carried through), and .rotate() bakes in the
  // original orientation before that metadata is dropped.
  let processed: Buffer;
  try {
    processed = await sharp(inputBuffer)
      .rotate()
      .resize(AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  const admin = createAdminClient();
  const path = `${userId}.webp`;
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, processed, { contentType: "image/webp", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: "upload_failed" }, { status: 502 });
  }

  const { data: publicUrlData } = admin.storage.from("avatars").getPublicUrl(path);
  // Cache-bust so a re-upload (same path, upsert) doesn't keep serving a
  // stale cached image under the old URL — supports replacing the avatar
  // later from the account page, per the approved architecture.
  const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  await prisma.profile.update({ where: { id: userId }, data: { avatarUrl } });

  return NextResponse.json({ avatarUrl });
}
