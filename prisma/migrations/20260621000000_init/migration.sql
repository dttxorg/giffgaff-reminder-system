-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SimStatus" AS ENUM ('active', 'paused');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('serverchan', 'bark');

-- CreateEnum
CREATE TYPE "SendStatus" AS ENUM ('success', 'failed');

-- CreateTable
CREATE TABLE "Sim" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL,
    "lastPortedAt" TIMESTAMP(3),
    "status" "SimStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "simId" INTEGER NOT NULL,
    "simLookupKey" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "channelKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "simId" INTEGER NOT NULL,
    "dayOffset" INTEGER NOT NULL,
    "bucket" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SendStatus" NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,

    CONSTRAINT "ReminderSent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" SERIAL NOT NULL,
    "simLookupKey" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "channelKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sim_phoneNumber_key" ON "Sim"("phoneNumber");

-- CreateIndex
CREATE INDEX "Sim_phoneNumber_idx" ON "Sim"("phoneNumber");

-- CreateIndex
CREATE INDEX "Sim_activatedAt_lastPortedAt_idx" ON "Sim"("activatedAt", "lastPortedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_simId_key" ON "User"("simId");

-- CreateIndex
CREATE INDEX "User_simLookupKey_idx" ON "User"("simLookupKey");

-- CreateIndex
CREATE INDEX "ReminderSent_sentAt_idx" ON "ReminderSent"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSent_simId_dayOffset_bucket_key" ON "ReminderSent"("simId", "dayOffset", "bucket");

-- CreateIndex
CREATE INDEX "VerificationCode_simLookupKey_code_idx" ON "VerificationCode"("simLookupKey", "code");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_simId_fkey" FOREIGN KEY ("simId") REFERENCES "Sim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderSent" ADD CONSTRAINT "ReminderSent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderSent" ADD CONSTRAINT "ReminderSent_simId_fkey" FOREIGN KEY ("simId") REFERENCES "Sim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

