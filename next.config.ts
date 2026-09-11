import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly — there's an unrelated package-lock.json
  // in the parent home directory that Turbopack would otherwise misdetect as
  // a monorepo root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Next.js's own dev-mode route indicator (the small "N" badge, bottom-left
  // by default) — not part of the app UI, dev-only, and already absent from
  // production builds, but disabled outright per request.
  devIndicators: false,
  // Root-caused a real bug: opening the dev server from a phone via its LAN
  // IP (http://192.168.0.173:3000) loaded the initial HTML fine but froze
  // there forever — no "tennis" reveal, no interaction. Confirmed via the
  // dev server's own log: "Blocked cross-origin request to Next.js dev
  // resource /_next/hmr from '192.168.0.173'". Next's dev server only
  // trusts `localhost`/`127.0.0.1` by default (see allowedDevOrigins docs);
  // Turbopack's dev client ties chunk registration to that HMR socket, so a
  // rejected connection means the client bundle (React hydration, framer-
  // motion, the intro's click/timer handlers) never runs at all — matching
  // the observed symptom exactly. Dev-only (this option has no effect on
  // `next build`/production); update this if the machine's LAN IP changes.
  allowedDevOrigins: ["192.168.0.173"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
    ],
  },
};

export default nextConfig;
