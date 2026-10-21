-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ROOT', 'ADMIN', 'VIEWER');

-- AlterTable: converte role de String para enum
-- O único usuário existente tem role 'ADMIN' — promovido a ROOT
ALTER TABLE "User"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "Role" USING (
    CASE "role"
      WHEN 'ROOT'   THEN 'ROOT'::"Role"
      WHEN 'ADMIN'  THEN 'ADMIN'::"Role"
      ELSE               'VIEWER'::"Role"
    END
  ),
  ALTER COLUMN "role" SET DEFAULT 'VIEWER'::"Role";

-- Promove o único admin existente a ROOT
UPDATE "User" SET role = 'ROOT' WHERE role = 'ADMIN';

-- CreateTable: tokens de recuperação de senha
CREATE TABLE "PasswordResetToken" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
