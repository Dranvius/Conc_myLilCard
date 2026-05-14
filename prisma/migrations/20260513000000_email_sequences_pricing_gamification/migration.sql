-- CreateEnum
CREATE TYPE "PricingRuleType" AS ENUM ('VOLUME', 'CUSTOMER_TYPE', 'PRODUCT_CATEGORY', 'FIXED_CAMPAIGN');

-- CreateTable: EmailTemplate
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailSequence
CREATE TABLE "EmailSequence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailSequenceStep
CREATE TABLE "EmailSequenceStep" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "delayHours" INTEGER NOT NULL DEFAULT 24,

    CONSTRAINT "EmailSequenceStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailSequenceEnrolment
CREATE TABLE "EmailSequenceEnrolment" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSequenceEnrolment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailSequenceEnrolmentStep
CREATE TABLE "EmailSequenceEnrolmentStep" (
    "id" TEXT NOT NULL,
    "enrolmentId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "EmailSequenceEnrolmentStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PricingRule
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PricingRuleType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER,
    "customerType" "CustomerType",
    "productCategory" TEXT,
    "productId" TEXT,
    "businessUnitId" TEXT,
    "discountPercent" DECIMAL(5,2),
    "discountAmount" DECIMAL(12,2),
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserStats
CREATE TABLE "UserStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "opportunitiesWon" INTEGER NOT NULL DEFAULT 0,
    "activitiesDone" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Badge
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserBadge
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PointAction
CREATE TABLE "PointAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_name_key" ON "EmailTemplate"("name");
CREATE INDEX "EmailTemplate_category_idx" ON "EmailTemplate"("category");
CREATE INDEX "EmailTemplate_isActive_idx" ON "EmailTemplate"("isActive");

CREATE UNIQUE INDEX "EmailSequence_name_key" ON "EmailSequence"("name");
CREATE INDEX "EmailSequence_isActive_idx" ON "EmailSequence"("isActive");

CREATE UNIQUE INDEX "EmailSequenceStep_sequenceId_stepOrder_key" ON "EmailSequenceStep"("sequenceId", "stepOrder");
CREATE INDEX "EmailSequenceStep_sequenceId_idx" ON "EmailSequenceStep"("sequenceId");
CREATE INDEX "EmailSequenceStep_templateId_idx" ON "EmailSequenceStep"("templateId");

CREATE UNIQUE INDEX "EmailSequenceEnrolment_sequenceId_contactId_key" ON "EmailSequenceEnrolment"("sequenceId", "contactId");
CREATE INDEX "EmailSequenceEnrolment_sequenceId_idx" ON "EmailSequenceEnrolment"("sequenceId");
CREATE INDEX "EmailSequenceEnrolment_contactId_idx" ON "EmailSequenceEnrolment"("contactId");

CREATE INDEX "EmailSequenceEnrolmentStep_enrolmentId_idx" ON "EmailSequenceEnrolmentStep"("enrolmentId");
CREATE INDEX "EmailSequenceEnrolmentStep_stepId_idx" ON "EmailSequenceEnrolmentStep"("stepId");
CREATE INDEX "EmailSequenceEnrolmentStep_scheduledAt_idx" ON "EmailSequenceEnrolmentStep"("scheduledAt");

CREATE INDEX "PricingRule_type_isActive_priority_idx" ON "PricingRule"("type", "isActive", "priority");
CREATE INDEX "PricingRule_productId_idx" ON "PricingRule"("productId");
CREATE INDEX "PricingRule_businessUnitId_idx" ON "PricingRule"("businessUnitId");

CREATE UNIQUE INDEX "UserStats_userId_key" ON "UserStats"("userId");

CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

CREATE INDEX "PointAction_userId_idx" ON "PointAction"("userId");
CREATE INDEX "PointAction_createdAt_idx" ON "PointAction"("createdAt");

-- AddForeignKey
ALTER TABLE "EmailSequenceStep" ADD CONSTRAINT "EmailSequenceStep_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "EmailSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailSequenceStep" ADD CONSTRAINT "EmailSequenceStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmailSequenceEnrolment" ADD CONSTRAINT "EmailSequenceEnrolment_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "EmailSequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmailSequenceEnrolmentStep" ADD CONSTRAINT "EmailSequenceEnrolmentStep_enrolmentId_fkey" FOREIGN KEY ("enrolmentId") REFERENCES "EmailSequenceEnrolment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailSequenceEnrolmentStep" ADD CONSTRAINT "EmailSequenceEnrolmentStep_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "EmailSequenceStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PointAction" ADD CONSTRAINT "PointAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
