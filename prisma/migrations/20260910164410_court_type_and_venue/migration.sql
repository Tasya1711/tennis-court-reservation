-- CreateEnum
CREATE TYPE "CourtType" AS ENUM ('INDOOR', 'OUTDOOR');

-- AlterTable
ALTER TABLE "courts" ADD COLUMN "type" "CourtType" NOT NULL DEFAULT 'INDOOR';

-- CreateTable
CREATE TABLE "venue" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "venue_pkey" PRIMARY KEY ("id")
);

-- RLS: public read (same rationale as courts — reference/display data, not
-- sensitive), no write policy for anon/authenticated (service-role/Prisma
-- only, same pattern as every other table — see ARCHITECTURE.md §4.2).
ALTER TABLE "venue" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_select_all" ON "venue"
  FOR SELECT USING (true);
