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
