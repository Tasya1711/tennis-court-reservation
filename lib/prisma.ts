import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

// Runtime connection — pooled (PgBouncer/Supavisor), separate from the
// direct connection prisma.config.ts uses for migrations. See
// ARCHITECTURE.md §4.3 for why these are two different URLs on Supabase.
declare global {
  var __prismaPool: Pool | undefined;
  var __prismaClient: PrismaClient | undefined;
}

function createClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return { pool, client: new PrismaClient({ adapter }) };
}

// In dev, Next.js hot-reloads modules on every edit, which would otherwise
// create a new connection pool per reload and exhaust Supabase's connection
// limit. Caching on globalThis survives HMR; production gets a fresh
// instance per server process, which is what we want.
let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = createClient().client;
} else {
  if (!global.__prismaClient) {
    const { pool, client } = createClient();
    global.__prismaPool = pool;
    global.__prismaClient = client;
  }
  prisma = global.__prismaClient;
}

export { prisma };
