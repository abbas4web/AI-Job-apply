-- ──────────────────────────────────────────────────────────────
-- Migration: update_application_status
--
-- 1. Drop the old ApplicationStatus enum values and replace with
--    the new set: SAVED, MATCHED, READY_TO_APPLY, APPLIED,
--    INTERVIEW, OFFER, REJECTED.
--
-- 2. Add matchScore (nullable Int) to applications.
--
-- 3. Drop unused columns: coverLetter, tailoredResume.
--
-- 4. Add unique(userId, jobId) + indexes.
--
-- PostgreSQL does not support ALTER TYPE … RENAME VALUE in older
-- versions, so we recreate the enum:
--   a. rename old type
--   b. create new type with correct values
--   c. alter column to use new type (casting via text)
--   d. drop old type
-- ──────────────────────────────────────────────────────────────

-- Step 1a: rename old enum so we can create the new one with the
--          same name
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";

-- Step 1b: create new enum
CREATE TYPE "ApplicationStatus" AS ENUM (
  'SAVED',
  'MATCHED',
  'READY_TO_APPLY',
  'APPLIED',
  'INTERVIEW',
  'OFFER',
  'REJECTED'
);

-- Step 1c: migrate existing rows — map every old value to SAVED
--          (all previous data predates the new workflow)
ALTER TABLE "applications"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ApplicationStatus"
    USING (
      CASE "status"::text
        WHEN 'APPLIED'      THEN 'APPLIED'::"ApplicationStatus"
        WHEN 'REJECTED'     THEN 'REJECTED'::"ApplicationStatus"
        ELSE                     'SAVED'::"ApplicationStatus"
      END
    ),
  ALTER COLUMN "status" SET DEFAULT 'SAVED'::"ApplicationStatus";

-- Step 1d: drop old enum
DROP TYPE "ApplicationStatus_old";

-- Step 2: add matchScore column
ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "matchScore" INTEGER;

-- Step 3: drop unused columns
ALTER TABLE "applications"
  DROP COLUMN IF EXISTS "coverLetter",
  DROP COLUMN IF EXISTS "tailoredResume";

-- Step 4a: unique constraint (one application per user per job)
ALTER TABLE "applications"
  ADD CONSTRAINT "applications_userId_jobId_key"
  UNIQUE ("userId", "jobId");

-- Step 4b: indexes
CREATE INDEX IF NOT EXISTS "applications_userId_idx" ON "applications"("userId");
CREATE INDEX IF NOT EXISTS "applications_jobId_idx"  ON "applications"("jobId");
