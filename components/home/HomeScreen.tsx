import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RevealOnMount } from "@/components/home/RevealOnMount";
import { CoachBookingButton } from "@/components/home/CoachBookingButton";
import { DesktopSplitScreen } from "@/components/layout/DesktopSplitScreen";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

type CourtType = "INDOOR" | "OUTDOOR";
type Court = { id: string; name: string; type: CourtType; priceUah: number };
type Venue = { name: string; address: string } | null;

// Short display label for the type legend only (e.g. "Court 1" -> "1") —
// a display transform, not a hardcoded court list; falls back to the full
// name for any court that doesn't follow the "Court N" pattern.
function shortLabel(name: string) {
  const match = name.match(/^court\s*(.+)$/i);
  return match ? match[1] : name;
}

// Server component — only the mount-triggered reveal animation
// (RevealOnMount) is client-side; everything else here is plain
// server-rendered markup, so /home ships/hydrates far less client JS than
// when the whole screen was "use client" just for three entrance fades.
//
// Two responsive trees, toggled by Tailwind breakpoint (not JS), sharing
// the same props: <768px renders the original approved mobile layout
// unchanged; >=768px renders the Tennis_desktop-referenced two-column
// layout. Kept as two trees rather than one conditional structure so the
// already-approved mobile DOM/behavior can't regress from reshuffling it.
export function HomeScreen({
  avatarUrl,
  venue,
  courts,
}: {
  avatarUrl: string | null;
  venue: Venue;
  courts: Court[];
}) {
  const t = useTranslations("Home");
  const tCommon = useTranslations("Common");
  const indoor = courts.filter((c) => c.type === "INDOOR").map((c) => shortLabel(c.name));
  const outdoor = courts.filter((c) => c.type === "OUTDOOR").map((c) => shortLabel(c.name));

  const courtGrid = (
    <div className="mt-3 grid grid-cols-3 gap-2.5">
      <div aria-hidden />
      {courts.map((court, i) => {
        const isHighlighted = i === 1; // matches the reference's B2 slot
        const isPremium = i === 3; // matches the reference's C1 slot
        const isLarge = i === 2; // matches the reference's A1 slot
        return (
          <Link
            key={court.id}
            href={`/reserve?court=${court.id}`}
            className={`relative flex h-20 flex-col justify-end rounded-xl border p-2.5 transition active:scale-[0.97] ${
              isHighlighted ? "border-lime-300 bg-white/[0.06]" : "border-white/10 bg-white/[0.06]"
            }`}
          >
            {isHighlighted && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-lime-300">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} stroke="black" className="h-3 w-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
            )}
            {isPremium && (
              <span className="absolute left-2 top-2 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-medium text-white/80">
                Premium
              </span>
            )}
            <span className={isLarge ? "text-lg font-bold text-white" : "text-sm font-medium text-white"}>
              {court.name}
            </span>
          </Link>
        );
      })}
    </div>
  );

  const coachCard = (
    <div className="mt-5 flex gap-3 rounded-2xl bg-white/5 p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <Image src="/images/coach_photo.jpeg" alt="" fill sizes="64px" className="object-cover" />
        <span className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 ring-1 ring-white/15">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-3.5 w-3.5 text-white">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.653v-1.343a49.04 49.04 0 0 0-9-2.02 49.04 49.04 0 0 0-9 2.02v1.343c0 .655.293 1.242.75 1.653m16.5 0a2.18 2.18 0 0 1-.75 1.653m0 0a2.18 2.18 0 0 1-1.5.615c-.616 0-1.184-.236-1.607-.615m1.607.615c.423.379.991.615 1.607.615m-9-3.5c.616 0 1.184.236 1.607.615m-1.607-.615a2.18 2.18 0 0 0-1.5.615"
            />
          </svg>
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="text-sm font-medium leading-snug text-white">{t("coachTitle")}</p>
        <p className="text-xs text-white/50">{t("coachSubtitle")}</p>
        <CoachBookingButton />
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile (<768px) — unchanged from the approved M4 layout ── */}
      <main className="min-h-dvh bg-neutral-950 md:hidden">
        {/* Photo header — avatar top-left, venue title/address/badge bottom-left,
            matching the reference's overlay layout. */}
        <div className="relative flex h-[42vh] min-h-[300px] w-full flex-col justify-between overflow-hidden px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-9">
          <Image
            src="/images/second-page_photo.jpeg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/70" />

          <RevealOnMount y={-8} className="relative z-10 flex items-center justify-between">
            <Link
              href="/account"
              aria-label={tCommon("profile")}
              className="relative block h-11 w-11 overflow-hidden rounded-full border-2 border-white/80 shadow-lg"
            >
              <Image
                src={avatarUrl ?? "/images/user-photo.jpeg"}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            </Link>
            <LanguageSwitcher />
          </RevealOnMount>

          <RevealOnMount y={10} delay={0.1} className="relative z-10">
            <h1 className="text-lg font-medium leading-tight text-white">
              {venue?.name ?? "Tennis Court"}
            </h1>
            {venue?.address && (
              <p className="text-[15px] leading-tight text-white/90">{venue.address}</p>
            )}
            <span className="mt-2 inline-block rounded-full border border-lime-300/60 px-2.5 py-0.5 text-[11px] font-medium text-lime-300">
              {t("topBadge")}
            </span>
          </RevealOnMount>
        </div>

        {/* Dark content panel — rounded top overlapping the photo. */}
        <RevealOnMount
          y={24}
          delay={0.15}
          duration={0.6}
          className="relative z-10 -mt-6 rounded-t-[2rem] bg-neutral-950 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6"
        >
          <div className="flex items-baseline justify-between">
            <p className="text-[15px] font-medium text-white">{t("chooseCourt")}</p>
            <p className="text-[11px] text-white/45">
              {indoor.length > 0 && <span>{indoor.join(", ")} {t("indoor")}</span>}
              {indoor.length > 0 && outdoor.length > 0 && <span> · </span>}
              {outdoor.length > 0 && <span>{outdoor.join(", ")} {t("outdoor")}</span>}
            </p>
          </div>

          {/* Reproduces Tennis-Court-Reservation_template.jpeg's grid exactly:
              a leading blank slot (the reference itself leaves this cell
              empty), then 5 real courts in the same reading order. The
              highlighted-border and "Premium" badge treatments are purely
              decorative/demonstrative — matching the reference's own demo
              state — not real "selected"/"premium" data; that's M5's job. */}
          {courtGrid}

          <div className="mt-5 h-px bg-white/10" />

          {coachCard}

          <Link
            href="/reserve"
            className="mt-5 block w-full rounded-full bg-white py-4 text-center text-[15px] font-semibold text-black transition active:scale-[0.99]"
          >
            {t("bookCta")}
          </Link>

          <p className="mt-3 text-center text-[11px] leading-snug text-white/40">
            {t("disclaimer")}
          </p>
        </RevealOnMount>
      </main>

      {/* ── Tablet/desktop (>=768px) — shared Tennis_desktop composition. ── */}
      <DesktopSplitScreen avatarUrl={avatarUrl}>
        <div className="flex flex-1 flex-col items-center justify-center bg-neutral-950 px-8 py-8 lg:px-12 lg:py-10">
          <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl">
            <p className="text-base font-medium text-white">{venue?.name ?? "Tennis Court"}</p>
            {venue?.address && <p className="text-sm text-white/60">{venue.address}</p>}

            <div className="mt-6 flex items-baseline justify-between">
              <p className="text-[15px] font-medium text-white">{t("chooseCourt")}</p>
              <p className="text-[11px] text-white/45">
                {indoor.length > 0 && <span>{indoor.join(", ")} {t("indoor")}</span>}
                {indoor.length > 0 && outdoor.length > 0 && <span> · </span>}
                {outdoor.length > 0 && <span>{outdoor.join(", ")} {t("outdoor")}</span>}
              </p>
            </div>

            {courtGrid}
            <div className="mt-5 h-px bg-white/10" />
            {coachCard}

            <Link
              href="/reserve"
              className="mt-6 block w-full max-w-xs rounded-full bg-white py-4 text-center text-[15px] font-semibold text-black transition hover:opacity-90"
            >
              {t("bookCta")}
            </Link>
            <p className="mt-3 max-w-xs text-[11px] leading-snug text-white/40">
              {t("disclaimer")}
            </p>
          </div>
        </div>
      </DesktopSplitScreen>
    </>
  );
}
