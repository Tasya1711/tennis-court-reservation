import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Disables pinch/gesture zoom — this is a booking UI, not zoomable content,
// and unintentional zoom (a stray pinch on a court card) breaks the layout.
// `width: device-width` + initialScale 1 is unchanged from Next's own
// default, so responsive breakpoints are unaffected; only user-initiated
// scaling is turned off.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  const description = t("description");
  // 1200x630 (1.91:1) — the standard large-card size for Open Graph / X.
  const socialImage = {
    url: "/images/og-tennis.jpg",
    width: 1200,
    height: 630,
    alt: "Tennis racket and ball on a green tennis court",
  };
  return {
    // Absolute base so the relative image URL above resolves to the real
    // site origin, not localhost, in social previews.
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: "Tennis",
    description,
    openGraph: {
      title: "Tennis",
      description,
      siteName: "Tennis Court Reservation",
      type: "website",
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: "Tennis",
      description,
      images: [socialImage],
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
