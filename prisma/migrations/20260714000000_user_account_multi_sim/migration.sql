-- UserAccountPhoneAsUsername
-- 重构 1: 登录从 User.simLookupKey(后 6 位) → User.username
-- 重构 2: 老数据迁移 — username 直接 = sim.phoneNumber(让客户无感迁移,
--   上百个老用户不用一个个通知"新账号是什么",他们继续用原手机号登录即可)
--
-- 关系保持 1:1(User.simId @unique 仍然存在)。
-- 一个 user 提醒一张 sim;想多张提醒 → 多个兑换码 → 多个账号。
--
-- 老数据迁移策略:
--   - 每个老 user: User.username = sim.phoneNumber
--   - 删 User.simLookupKey
--   - phoneNumber 全表唯一,所以 username 全表唯一(1:1 关系兜底)

-- 1. 加列(nullable,允许存量数据先存在)
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- 2. 从 sim 取 phoneNumber 回填 username
UPDATE "User" AS u
SET "username" = s."phoneNumber"
FROM "Sim" AS s
WHERE u."simId" = s.id;

-- 3. 兜底:极少数没有 simId 的老 user(历史异常数据),用 u_<id> 命名
UPDATE "User"
SET "username" = 'u_' || "id"
WHERE "username" IS NULL;

-- 4. username 设 NOT NULL + UNIQUE
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_username_idx" ON "User"("username");

-- 5. 删老字段 User.simLookupKey(只 lookup 用,不再需要)
ALTER TABLE "User" DROP COLUMN "simLookupKey";
