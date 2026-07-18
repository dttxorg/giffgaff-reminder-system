DROP INDEX IF EXISTS "ReminderSent_userId_aggregateDay_key";

-- 汇总频率由当天最接近保号日期的号码决定：
-- dayOffset 决定每天次数，bucket 保证同一提醒时段只发送一条汇总。
CREATE UNIQUE INDEX "ReminderSent_userId_aggregateDay_dayOffset_bucket_key"
ON "ReminderSent"("userId", "aggregateDay", "dayOffset", "bucket");
