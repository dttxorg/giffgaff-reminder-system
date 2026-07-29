CREATE TYPE "Carrier" AS ENUM ('giffgaff', 'ctexcel');

ALTER TABLE "Sim"
  ADD COLUMN "carrier" "Carrier" NOT NULL DEFAULT 'giffgaff',
  ADD COLUMN "reminderStartDay" INTEGER NOT NULL DEFAULT 170,
  ADD COLUMN "cycleDays" INTEGER NOT NULL DEFAULT 180,
  ADD CONSTRAINT "Sim_reminder_schedule_check"
    CHECK (
      "reminderStartDay" >= 0
      AND "cycleDays" > "reminderStartDay"
      AND "cycleDays" <= 3650
    );

ALTER TABLE "User"
  ADD COLUMN "defaultChannel" "Channel" NOT NULL DEFAULT 'serverchan',
  ADD COLUMN "defaultChannelKey" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "availableReminderSlots" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User"
  ADD CONSTRAINT "User_available_reminder_slots_check"
    CHECK ("availableReminderSlots" >= 0);

WITH first_sim AS (
  SELECT DISTINCT ON ("userId")
    "userId",
    "channel",
    "channelKey"
  FROM "Sim"
  WHERE "userId" IS NOT NULL
  ORDER BY "userId", "id"
)
UPDATE "User" AS usr
SET
  "defaultChannel" = first_sim."channel",
  "defaultChannelKey" = first_sim."channelKey"
FROM first_sim
WHERE usr."id" = first_sim."userId";

CREATE INDEX "Sim_carrier_status_idx" ON "Sim"("carrier", "status");
