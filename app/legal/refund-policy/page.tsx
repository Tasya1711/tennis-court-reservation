import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { LegalPage } from "@/components/legal/LegalPage";

// Public page — no auth required, but shows the real avatar in the shared
// desktop panel when a session happens to exist, same as the rest of the
// app's DesktopSplitScreen usages.
export default async function RefundPolicyPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const profile = data?.claims
    ? await prisma.profile.findUnique({ where: { id: data.claims.sub }, select: { avatarUrl: true } })
    : null;

  const t = await getTranslations("Legal");
  const tCommon = await getTranslations("Common");

  return (
    <LegalPage
      title={t("refund.title")}
      demoNotice={t("demoNotice")}
      sections={t.raw("refund.sections")}
      contactLabel={t("contactLabel")}
      contactValue={t("contactValue")}
      homeLabel={tCommon("home")}
      avatarUrl={profile?.avatarUrl ?? null}
    />
  );
}
