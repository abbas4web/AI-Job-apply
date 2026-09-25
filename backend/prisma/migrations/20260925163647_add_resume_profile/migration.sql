-- CreateTable
CREATE TABLE "resume_profiles" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "skills" TEXT[],
    "yearsOfExperience" DOUBLE PRECISION NOT NULL,
    "jobTitles" TEXT[],
    "technologies" TEXT[],
    "education" JSONB NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resume_profiles_resumeId_key" ON "resume_profiles"("resumeId");

-- AddForeignKey
ALTER TABLE "resume_profiles" ADD CONSTRAINT "resume_profiles_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
