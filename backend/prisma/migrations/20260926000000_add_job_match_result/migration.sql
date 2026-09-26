-- CreateEnum
CREATE TYPE "JobMatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "job_match_results" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "jobId"           TEXT NOT NULL,
    "resumeId"        TEXT NOT NULL,
    "status"          "JobMatchStatus" NOT NULL DEFAULT 'PENDING',
    "matchScore"      INTEGER,
    "matchedSkills"   TEXT[] NOT NULL DEFAULT '{}',
    "missingSkills"   TEXT[] NOT NULL DEFAULT '{}',
    "experienceMatch" BOOLEAN,
    "locationMatch"   BOOLEAN,
    "reason"          TEXT,
    "queueJobId"      TEXT,
    "errorMessage"    TEXT,
    "processedAt"     TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_match_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: enforce one result per (user, job, resume) — makes upsert idempotent
CREATE UNIQUE INDEX "job_match_results_userId_jobId_resumeId_key"
    ON "job_match_results"("userId", "jobId", "resumeId");

-- CreateIndex: fast lookups by user and by job
CREATE INDEX "job_match_results_userId_idx" ON "job_match_results"("userId");
CREATE INDEX "job_match_results_jobId_idx"  ON "job_match_results"("jobId");

-- AddForeignKey
ALTER TABLE "job_match_results"
    ADD CONSTRAINT "job_match_results_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_match_results"
    ADD CONSTRAINT "job_match_results_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "jobs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_match_results"
    ADD CONSTRAINT "job_match_results_resumeId_fkey"
    FOREIGN KEY ("resumeId") REFERENCES "resumes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
