-- AlterTable: 给 Sim 表加 portToken 列
--
-- 目的: 把公开 URL 中的可枚举自增 id 替换为不可枚举的随机 token,
-- 防止有人通过 /p/1, /p/2, ... 枚举获取所有 sim 的 PII(手机号等)。
--
-- 设计要点:
-- - 列设为 nullable,确保对存量数据非破坏性(不要求 NOT NULL)
-- - 加 @unique 索引,后续按 token 查询可以走索引
-- - 不在 SQL 里 backfill,改由应用层 lazy 生成(详见 lib/port-token.ts
--   的 ensureSimPortToken),避免长事务锁住大表
ALTER TABLE "Sim" ADD COLUMN "portToken" TEXT;
CREATE UNIQUE INDEX "Sim_portToken_key" ON "Sim"("portToken");
