-- AddReminderLookupIndexes
-- 用户中心与后台详情都按 SIM/用户筛选后，再按发送时间排序或截取范围。
-- 复合索引避免提醒记录增长后重复扫描同一主体的全部历史并额外排序。

CREATE INDEX "ReminderSent_simId_sentAt_idx"
  ON "ReminderSent"("simId", "sentAt");

CREATE INDEX "ReminderSent_userId_sentAt_idx"
  ON "ReminderSent"("userId", "sentAt");
