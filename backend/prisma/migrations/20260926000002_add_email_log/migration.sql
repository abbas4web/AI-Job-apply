-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "email_logs" (
    "id"             TEXT        NOT NULL,
    "userId"         TEXT        NOT NULL,
    "applicationId"  TEXT        NOT NULL,
    "status"         "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "recipientEmail" TEXT        NOT NULL,
    "subject"        TEXT        NOT NULL,
    "providerMsgId"  TEXT,
    "errorMessage"   TEXT,
    "queueJobId"     TEXT,
    "sentAt"         TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_logs_userId_idx"        ON "email_logs"("userId");
CREATE INDEX "email_logs_applicationId_idx" ON "email_logs"("applicationId");

-- AddForeignKey
ALTER TABLE "email_logs"
    ADD CONSTRAINT "email_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
