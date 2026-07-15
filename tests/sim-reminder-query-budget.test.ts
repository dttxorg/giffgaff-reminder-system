import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("号码详情统计查询预算", () => {
  const source = fs.readFileSync("lib/sim-reminder-stats.ts", "utf8");

  it("使用一次物化快照同时生成最近记录、周期记录和状态计数", () => {
    expect(source.match(/prisma\.\$queryRaw/g)).toHaveLength(1);
    expect(source).toContain("WITH reminder_base AS MATERIALIZED");
    expect(source).toContain('AS "recentReminders"');
    expect(source).toContain('AS "periodReminders"');
    expect(source).toContain('AS "successCount"');
    expect(source).toContain('AS "failedCount"');
    expect(source).not.toContain("prisma.reminderSent.findMany");
    expect(source).not.toContain("prisma.reminderSent.groupBy");
  });

  it("最近记录与周期载荷都有明确上界", () => {
    expect(source).toContain("LIMIT 5");
    expect(source).toContain('WHERE "sentAt" >= ${activityStart}');
  });
});
