-- 仅迁移仍使用 CTExcel 旧默认 80/90 的号码；其他自定义周期保持不变。
UPDATE "Sim"
SET
  "reminderStartDay" = 85,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "carrier" = 'ctexcel'
  AND "reminderStartDay" = 80
  AND "cycleDays" = 90;
