-- CreateEnum
CREATE TYPE "ProductSegment" AS ENUM ('AMBULATORY', 'HOSPITAL', 'BOTH');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "requiresPrescription" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "specifications" JSONB,
ADD COLUMN     "targetSegment" "ProductSegment" NOT NULL DEFAULT 'BOTH';
