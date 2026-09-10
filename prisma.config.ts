import { defineConfig, env } from "prisma/config";

// CLI-only config (migrate, studio, generate). Uses the DIRECT (unpooled)
// connection — PgBouncer's transaction-pooling mode doesn't support the
// advisory locks / prepared statements Prisma Migrate needs.
// The application's runtime PrismaClient does NOT use this file — it
// connects separately via a driver adapter in lib/prisma.ts, pointed at the
// pooled DATABASE_URL. See ARCHITECTURE.md §4.3.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
