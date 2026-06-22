-- AddCardKey
-- 卡密兑换功能：bound（已绑 sim）/ unbound（空模板）两种模式

-- CreateEnum
CREATE TYPE "CardMode" AS ENUM ('bound', 'unbound');

-- CreateTable
CREATE TABLE "CardKey" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "mode" "CardMode" NOT NULL,
    "phoneNumber" TEXT,
    "activatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "usedSimId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "CardKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardKey_code_key" ON "CardKey"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CardKey_usedSimId_key" ON "CardKey"("usedSimId");

-- CreateIndex
CREATE INDEX "CardKey_mode_used_idx" ON "CardKey"("mode", "used");

-- CreateIndex
CREATE INDEX "CardKey_createdAt_idx" ON "CardKey"("createdAt");