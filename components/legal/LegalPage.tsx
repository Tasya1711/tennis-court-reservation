import Image from "next/image";
import Link from "next/link";
import { DesktopSplitScreen } from "@/components/layout/DesktopSplitScreen";
import { BackButton } from "@/components/layout/BackButton";

type Section = { heading: string; body: string };

// Shared layout for the three placeholder legal pages (privacy, terms,
// refund policy) — reuses the same photo-header + light content-panel
// treatment as /reserve/summary and /account, and the shared
// DesktopSplitScreen for >=768px, rather than inventing a new page shell.
export function LegalPage({
  title,
  demoNotice,
  sections,
  contactLabel,
  contactValue,
  homeLabel,
  avatarUrl,
}: {
  title: string;
  demoNotice: string;
  sections: Section[];
  contactLabel: string;
  contactValue: string;
  homeLabel: string;
  avatarUrl: string | null;
}) {
  const content = (
    <>
      <h1 className="text-xl font-medium">{title}</h1>
      <p className="mt-3 rounded-xl bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-800">
        {demoNotice}
      </p>

      <div className="mt-6 space-y-5">
        {sections.map((section) => (
          <div key={section.heading}>
            <h2 className="text-sm font-semibold text-neutral-900">{section.heading}</h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">{section.body}</p>
          </div>
        ))}
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">{contactLabel}</h2>
          <p className="mt-1 text-sm text-neutral-600">{contactValue}</p>
        </div>
      </div>

      <Link
        href="/home"
        className="mt-8 block w-full rounded-full bg-neutral-900 py-4 text-center text-[15px] font-semibold text-white"
      >
        {homeLabel}
      </Link>
    </>
  );

  return (
    <>
      {/* ── Mobile (<768px) — same photo-header + light panel treatment as
          /reserve/summary and /account. ── */}
      <main className="relative min-h-dvh overflow-hidden bg-[#f4f1ec] md:hidden">
        <div className="relative h-[20vh] min-h-[140px] w-full overflow-hidden px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
          <Image src="/images/first-page_photo.jpeg" alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/55" />
          <div className="relative z-10">
            <BackButton useHistory />
          </div>
        </div>

        <div className="relative z-10 -mt-6 rounded-t-[2rem] bg-[#f4f1ec] px-4 pb-10 pt-6 text-neutral-900">
          {content}
        </div>
      </main>

      {/* ── Tablet/desktop (>=768px) — shared Tennis_desktop composition. ── */}
      <DesktopSplitScreen avatarUrl={avatarUrl}>
        <div className="flex flex-1 flex-col items-center bg-[#f4f1ec] px-8 py-8 text-neutral-900 lg:px-12">
          <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl">
            <BackButton useHistory className="mb-4" />
            {content}
          </div>
        </div>
      </DesktopSplitScreen>
    </>
  );
}
