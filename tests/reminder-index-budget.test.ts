import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("提醒记录高频查询索引", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  const migration = fs.readFileSync(
    "prisma/migrations/20260715000000_add_reminder_lookup_indexes/migration.sql",
    "utf8"
  );
  const filterMigration = fs.readFileSync(
    "prisma/migrations/20260715010000_add_reminder_filter_indexes/migration.sql",
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

  it("Schema 和迁移覆盖后台状态/渠道时间线筛选", () => {
    expect(schema).toContain("@@index([status, sentAt])");
    expect(schema).toContain("@@index([channel, sentAt])");
    expect(filterMigration).toContain('"ReminderSent_status_sentAt_idx"');
    expect(filterMigration).toContain(
      'ON "ReminderSent"("status", "sentAt")'
    );
    expect(filterMigration).toContain('"ReminderSent_channel_sentAt_idx"');
    expect(filterMigration).toContain(
      'ON "ReminderSent"("channel", "sentAt")'
    );
  });

  it("多号码汇总提醒具有用户日 + 紧急度 bucket 唯一索引", () => {
    const aggregateMigration = fs.readFileSync(
      "prisma/migrations/20260718040000_adjust_account_reminder_frequency/migration.sql",
      "utf8"
    );
    expect(schema).toContain(
      "@@unique([userId, aggregateDay, dayOffset, bucket])"
    );
    expect(aggregateMigration).toContain(
      '"ReminderSent_userId_aggregateDay_dayOffset_bucket_key"'
    );
    expect(aggregateMigration).toContain(
      'ON "ReminderSent"("userId", "aggregateDay", "dayOffset", "bucket")'
    );
  });
});
