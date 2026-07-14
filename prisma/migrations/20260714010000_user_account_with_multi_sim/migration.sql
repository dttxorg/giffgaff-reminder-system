-- UserAccountWithMultiSim
-- 把 User 从 1:1 改回 1:N(一个账号可管理多张 SIM 卡)
-- 推送渠道从 User 下沉到 Sim(每张 SIM 可独立设渠道,账号也可统一用同一渠道)
--
-- 数据迁移策略:
--  1. 加 Sim.channel/channelKey/userId 列
--  2. 把 User.channel/channelKey 复制到 User.simId 指向的 sim
--  3. 把 User.simId 搬到 Sim.userId(每张老 sim 都挂到对应 user)
--  4. ReminderSent 加 channel/channelKey 列,从 sim 回填
--  5. 删 User.simId / User.channel / User.channelKey
--  6. 索引 + FK
--  7. username 已是上一轮迁移填好的(sim.phoneNumber)

-- 1. 加 Sim.channel/channelKey/userId(nullable)
ALTER TABLE "Sim" ADD COLUMN "channel" "Channel" NOT NULL DEFAULT 'serverchan';
ALTER TABLE "Sim" ADD COLUMN "channelKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Sim" ADD COLUMN "userId" INTEGER;

-- 2. 把 User 的 simId / channel / channelKey 下沉到 Sim
UPDATE "Sim" AS s
SET
  "userId" = u."id",
  "channel" = u."channel",
  "channelKey" = u."channelKey"
FROM "User" AS u
WHERE s."id" = u."simId";

-- 3. 给 ReminderSent 加 channel/channelKey 列(发送时的快照,重发/审计用)
ALTER TABLE "ReminderSent" ADD COLUMN "channel" "Channel" NOT NULL DEFAULT 'serverchan';
ALTER TABLE "ReminderSent" ADD COLUMN "channelKey" TEXT NOT NULL DEFAULT '';

-- 4. 回填 ReminderSent 的 channel 快照(从 sim 拿)
UPDATE "ReminderSent" AS r
SET
  "channel" = s."channel",
  "channelKey" = s."channelKey"
FROM "Sim" AS s
WHERE r."simId" = s."id";

-- 5. ReminderSent.channel/channelKey NOT NULL(已经回填)
ALTER TABLE "ReminderSent" ALTER COLUMN "channel" DROP DEFAULT;
ALTER TABLE "ReminderSent" ALTER COLUMN "channelKey" DROP DEFAULT;

-- 6. 索引 + FK
CREATE INDEX "Sim_userId_idx" ON "Sim"("userId");
ALTER TABLE "Sim" ADD CONSTRAINT "Sim_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;

-- 7. 删 User 字段
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_simId_fkey";
DROP INDEX IF EXISTS "User_simId_key";
ALTER TABLE "User" DROP COLUMN "simId";
ALTER TABLE "User" DROP COLUMN "channel";
ALTER TABLE "User" DROP COLUMN "channelKey";
