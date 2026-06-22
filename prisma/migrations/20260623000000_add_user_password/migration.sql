-- AddUserPassword
-- 加密码登录支持：每 user 一个 scrypt 密码哈希 + 登录失败计数 + 锁定时间
-- 旧 user（passwordHash = NULL）暂时无法登录，需管理员在后台 /admin/users 重置密码

-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);