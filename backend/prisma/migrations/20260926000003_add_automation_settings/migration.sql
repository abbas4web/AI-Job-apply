-- CreateTable: user_automation_settings
-- One row per user (UNIQUE on userId). Created lazily on first GET.

CREATE TABLE "user_automation_settings" (
    "id"                 TEXT        NOT NULL,
    "userId"             TEXT        NOT NULL,
    "minimumMatchScore"  INTEGER     NOT NULL DEFAULT 70,
    "preferredJobTitles" TEXT[]      NOT NULL DEFAULT '{}',
    "preferredLocations" TEXT[]      NOT NULL DEFAULT '{}',
    "requiredSkills"     TEXT[]      NOT NULL DEFAULT '{}',
    "excludedCompanies"  TEXT[]      NOT NULL DEFAULT '{}',
    "autoApplyEnabled"   BOOLEAN     NOT NULL DEFAULT FALSE,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_automation_settings_pkey" PRIMARY KEY ("id")
);

-- Enforce one settings row per user
CREATE UNIQUE INDEX "user_automation_settings_userId_key"
    ON "user_automation_settings"("userId");

-- FK → users
ALTER TABLE "user_automation_settings"
    ADD CONSTRAINT "user_automation_settings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
