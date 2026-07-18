-- 所有历史 SIM 补齐不可枚举公开 token。两段 UUID 去连字符后为 64 位十六进制，
-- 具有约 244 bit 随机熵；后续应用生成仍使用 192 bit base64url token。
UPDATE "Sim"
SET "portToken" = REPLACE(gen_random_uuid()::text, '-', '')
  || REPLACE(gen_random_uuid()::text, '-', '')
WHERE "portToken" IS NULL;

ALTER TABLE "Sim" ALTER COLUMN "portToken" SET NOT NULL;
