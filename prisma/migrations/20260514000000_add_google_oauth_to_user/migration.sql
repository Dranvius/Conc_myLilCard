-- AlterTable: agregar campos para autenticación con Google OAuth
ALTER TABLE "User" ADD COLUMN "googleId" TEXT,
ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'LOCAL',
ADD COLUMN "avatarUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- Permitir passwordHash nulo para usuarios que se registran solo con Google
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
