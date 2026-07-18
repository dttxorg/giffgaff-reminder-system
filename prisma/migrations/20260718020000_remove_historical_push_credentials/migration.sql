-- 历史提醒不再保留可重放的推送凭据；重发改用 SIM 当前配置。
UPDATE "ReminderSent" SET "channelKey" = '' WHERE "channelKey" <> '';
