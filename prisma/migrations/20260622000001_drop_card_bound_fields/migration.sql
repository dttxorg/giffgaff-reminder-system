-- DropCardBoundFields
-- 卡密功能简化：bound 模式（生成时已绑 sim）由原 /admin/sims 流程承担
-- 只保留 unbound 模式：客户兑换时填手机号+激活日期
-- 删除 mode 字段、phoneNumber、activatedAt 以及 CardMode enum

-- DropIndex
DROP INDEX IF EXISTS "CardKey_mode_used_idx";

-- AlterTable
ALTER TABLE "CardKey" DROP COLUMN "mode",
DROP COLUMN "phoneNumber",
DROP COLUMN "activatedAt";

-- DropEnum
DROP TYPE "CardMode";