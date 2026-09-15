import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

// Shared Tennis_desktop-referenced composition, used identically across
// every page at >=768px (home, reserve, reserve/summary, account, auth):
// one large rounded panel — near edge-to-edge, not a small centered card
// — split into that page's own content (left, via `children`) and
// first-page_photo.jpeg (right), spanning the panel's full height. TENNIS
// and the avatar sit directly on the photo itself (top-left/top-right),
// never in a separate header bar above the split. Each page keeps its own
// existing mobile tree completely untouched; this component only ever
// renders at >=768px (the mobile tree is `md:hidden`, this is `hidden
// md:flex`), so there is no risk of it affecting the approved mobile
// layout.
export function DesktopSplitScreen({
  avatarUrl,
  children,
}: {
  avatarUrl: string | null;
  children: ReactNode;
}) {
  return (
    <div className="hidden min-h-dvh items-center justify-center bg-neutral-100 p-3 md:flex lg:p-5">
      {/* No background color here on purpose — each page's own left-side
          content brings its own (dark for /home, light cream for
          /reserve, /reserve/summary, /account, matching what that page
          already used on mobile), so this composition doesn't force a
          single color scheme onto every page. */}
      <div className="flex h-[calc(100dvh-1.5rem)] w-full max-w-[1700px] overflow-hidden rounded-[2rem] shadow-2xl lg:h-[calc(100dvh-2.5rem)] lg:rounded-[2.5rem]">
        {/* Scrolling stays functional (overflow-y-auto) — only the visible
            scrollbar itself is suppressed, since the reference layout has
            no chrome between the content and the photo. */}
        <div className="flex flex-1 flex-col overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>

        {/* Photo occupies the full height of the panel — no separate
            card/border/black margin around it. Exactly half the panel's
            width (not content-driven), matching the left side, which is
            `flex-1` and therefore also fills the other half exactly. */}
        <div className="relative hidden w-1/2 shrink-0 md:block">
          <Image
            src="/images/first-page_photo.jpeg"
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 0px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/25" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-6 lg:p-8">
            <span className="text-sm font-semibold tracking-[0.3em] text-white">TENNIS</span>
            <Link
              href="/account"
              aria-label="Мій профіль"
              className="relative block h-10 w-10 overflow-hidden rounded-full border-2 border-white/80 shadow-lg"
            >
              <Image
                src={avatarUrl ?? "/images/user-photo.jpeg"}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            </Link>
          </div>

          {/* Short tennis-club caption in place of the reference's
              Titleist promotional copy — same text on every page, since
              it's an atmospheric caption on the shared photo panel, not
              page-specific content. */}
          <div className="absolute inset-x-0 bottom-0 p-6 lg:p-8">
            <span className="inline-block rounded-full border border-lime-300/60 px-2.5 py-0.5 text-[11px] font-medium text-lime-300">
              TENNIS CLUB
            </span>
            <p className="mt-3 text-2xl font-medium text-white lg:text-3xl">Ваш корт чекає</p>
            <p className="mt-2 max-w-xs text-sm text-white/80">
              П’ять кортів, миттєве бронювання та безпечна оплата онлайн.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
