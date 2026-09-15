import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AddCourtForm } from "@/components/admin/AddCourtForm";
import { CourtRow } from "@/components/admin/CourtRow";
import type { Court } from "@/components/admin/shared";

// Server component — AddCourtForm/CourtRow (the only interactive parts)
// live in their own client files now, so this screen's own markup (photo
// header, court list wrapper) ships as plain HTML instead of client JS.
export function AdminCourtsScreen({ courts }: { courts: Court[] }) {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#f4f1ec]">
      <div className="relative h-[22vh] min-h-[170px] w-full overflow-hidden px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
        <Image src="/images/first-page_photo.jpeg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/55" />
        <div className="relative z-10 flex items-center justify-between">
          <h1 className="text-lg font-medium text-white">{t("title")}</h1>
          <Link
            href="/home"
            aria-label={tCommon("home")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm"
          >
            <BackIcon />
          </Link>
        </div>
      </div>

      <div className="relative z-10 -mt-6 rounded-t-[2rem] bg-[#f4f1ec] px-4 pb-10 pt-6 text-neutral-900">
        <AddCourtForm />

        <p className="mt-8 text-[15px] font-medium">{t("courtsCount", { count: courts.length })}</p>
        <div className="mt-4 space-y-3">
          {courts.map((c) => (
            <CourtRow key={c.id} court={c} />
          ))}
        </div>
      </div>
    </main>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="white" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}
