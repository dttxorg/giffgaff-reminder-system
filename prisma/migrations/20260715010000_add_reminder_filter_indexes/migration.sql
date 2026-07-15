-- AddReminderFilterIndexes
-- 后台提醒日志经常按状态或渠道筛选，并按发送时间倒序分页/限定日期范围。
-- 复合索引让 PostgreSQL 直接在目标分组内扫描时间线，避免先扫描全部日期记录再过滤。

CREATE INDEX "ReminderSent_status_sentAt_idx"
  ON "ReminderSent"("status", "sentAt");

CREATE INDEX "ReminderSent_channel_sentAt_idx"
  ON "ReminderSent"("channel", "sentAt");
