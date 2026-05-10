-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
    'GENERAL',
    'PUBLIC_LEAD',
    'OPPORTUNITY_ASSIGNED',
    'ACTIVITY_DUE',
    'ACTIVITY_OVERDUE',
    'PROPOSAL_EXPIRING',
    'INVOICE_OVERDUE'
);

-- AlterTable
ALTER TABLE "Contact"
ADD COLUMN "source" "LeadSource";

-- AlterTable
ALTER TABLE "SalesOpportunity"
ADD COLUMN "stageChangedAt" TIMESTAMP(3);

UPDATE "SalesOpportunity"
SET "stageChangedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "stageChangedAt" IS NULL;

ALTER TABLE "SalesOpportunity"
ALTER COLUMN "stageChangedAt" SET NOT NULL,
ALTER COLUMN "stageChangedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Notification"
ADD COLUMN "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "referenceType" TEXT,
ADD COLUMN "referenceId" TEXT,
ADD COLUMN "dedupeKey" TEXT;

-- CreateTable
CREATE TABLE "AssignmentCursor" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "businessUnitId" TEXT,
    "lastUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentCursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contact_source_idx" ON "Contact"("source");

-- CreateIndex
CREATE INDEX "SalesOpportunity_source_idx" ON "SalesOpportunity"("source");

-- CreateIndex
CREATE INDEX "SalesOpportunity_stageChangedAt_idx" ON "SalesOpportunity"("stageChangedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_referenceType_referenceId_idx" ON "Notification"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentCursor_scopeKey_key" ON "AssignmentCursor"("scopeKey");

-- CreateIndex
CREATE INDEX "AssignmentCursor_entityType_idx" ON "AssignmentCursor"("entityType");

-- CreateIndex
CREATE INDEX "AssignmentCursor_roleName_idx" ON "AssignmentCursor"("roleName");

-- CreateIndex
CREATE INDEX "AssignmentCursor_businessUnitId_idx" ON "AssignmentCursor"("businessUnitId");

-- CreateIndex
CREATE INDEX "AssignmentCursor_lastUserId_idx" ON "AssignmentCursor"("lastUserId");
