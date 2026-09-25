-- AlterTable: drop old url column, add new fields
ALTER TABLE "jobs" DROP COLUMN IF EXISTS "url";

ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "skills"      TEXT[]            NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "sourceUrl"   TEXT              NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "externalId"  TEXT,
  ADD COLUMN IF NOT EXISTS "isDuplicate" BOOLEAN           NOT NULL DEFAULT FALSE;

-- CreateIndex: composite unique on (source, externalId) — only when externalId is not null
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_source_externalId_key"
  ON "jobs"("source", "externalId")
  WHERE "externalId" IS NOT NULL;
