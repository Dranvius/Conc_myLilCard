-- CreateTable
CREATE TABLE "OpportunityStageHistory" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "fromStage" "OpportunityStage",
    "toStage" "OpportunityStage" NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "OpportunityStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "roleName" TEXT NOT NULL DEFAULT 'SALES',
    "businessUnitId" TEXT,
    "leadSource" "LeadSource",
    "city" TEXT,
    "country" TEXT,
    "minEstimatedValue" DECIMAL(12,2),
    "maxEstimatedValue" DECIMAL(12,2),
    "minProbability" INTEGER,
    "maxProbability" INTEGER,
    "priorityBand" TEXT,
    "targetUserIds" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentRule_pkey" PRIMARY KEY ("id")
);

-- Backfill
INSERT INTO "OpportunityStageHistory" (
    "id",
    "opportunityId",
    "toStage",
    "changedAt",
    "metadata"
)
SELECT
    CONCAT('legacy-stage-', "id"),
    "id",
    "stage",
    COALESCE("stageChangedAt", "createdAt", CURRENT_TIMESTAMP),
    jsonb_build_object('origin', 'migration-backfill')
FROM "SalesOpportunity";

-- CreateIndex
CREATE INDEX "OpportunityStageHistory_opportunityId_changedAt_idx" ON "OpportunityStageHistory"("opportunityId", "changedAt");

-- CreateIndex
CREATE INDEX "OpportunityStageHistory_changedById_idx" ON "OpportunityStageHistory"("changedById");

-- CreateIndex
CREATE INDEX "OpportunityStageHistory_toStage_idx" ON "OpportunityStageHistory"("toStage");

-- CreateIndex
CREATE INDEX "AssignmentRule_entityType_isActive_priority_idx" ON "AssignmentRule"("entityType", "isActive", "priority");

-- CreateIndex
CREATE INDEX "AssignmentRule_businessUnitId_idx" ON "AssignmentRule"("businessUnitId");

-- CreateIndex
CREATE INDEX "AssignmentRule_leadSource_idx" ON "AssignmentRule"("leadSource");

-- CreateIndex
CREATE INDEX "AssignmentRule_city_idx" ON "AssignmentRule"("city");

-- AddForeignKey
ALTER TABLE "OpportunityStageHistory" ADD CONSTRAINT "OpportunityStageHistory_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "SalesOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityStageHistory" ADD CONSTRAINT "OpportunityStageHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRule" ADD CONSTRAINT "AssignmentRule_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
