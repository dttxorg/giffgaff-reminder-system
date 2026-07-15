import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("提醒记录高频查询索引", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  const migration = fs.readFileSync(
    "prisma/migrations/20260715000000_add_reminder_lookup_indexes/migration.sql",
    "utf8"
  );

  it("Schema 覆盖按 SIM/用户读取时间线的查询形状", () => {
    expect(schema).toContain("@@index([simId, sentAt])");
    expect(schema).toContain("@@index([userId, sentAt])");
  });

  it("迁移创建与 Prisma 命名一致的两个复合索引", () => {
    expect(migration).toContain('"ReminderSent_simId_sentAt_idx"');
    expect(migration).toContain('ON "ReminderSent"("simId", "sentAt")');
    expect(migration).toContain('"ReminderSent_userId_sentAt_idx"');
    expect(migration).toContain('ON "ReminderSent"("userId", "sentAt")');
  });
});
