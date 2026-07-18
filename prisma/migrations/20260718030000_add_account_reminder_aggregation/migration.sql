ALTER TABLE "ReminderSent"
ADD COLUMN "aggregateDay" TEXT,
ADD COLUMN "aggregateSimCount" INTEGER NOT NULL DEFAULT 1;

-- PostgreSQL 的 UNIQUE 允许多条 NULL，因此普通逐号码提醒保持原行为；
-- 汇总提醒写入 YYYY-MM-DD 后，同一用户同一上海日只保留一条。
CREATE UNIQUE INDEX "ReminderSent_userId_aggregateDay_key"
ON "ReminderSent"("userId", "aggregateDay");
