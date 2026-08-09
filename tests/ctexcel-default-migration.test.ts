import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("CTExcel 默认提醒日迁移", () => {
  const sql = fs.readFileSync(
    "prisma/migrations/20260809000000_delay_ctexcel_reminder_start/migration.sql",
    "utf8"
  );

  it("只把仍使用旧 80/90 默认的 CTExcel 号码改为 85/90", () => {
    expect(sql).toContain('"reminderStartDay" = 85');
    expect(sql).toContain('WHERE "carrier" = \'ctexcel\'');
    expect(sql).toContain('AND "reminderStartDay" = 80');
    expect(sql).toContain('AND "cycleDays" = 90');
  });
});
