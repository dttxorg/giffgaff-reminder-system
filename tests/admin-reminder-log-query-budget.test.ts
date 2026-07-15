import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("提醒日志页查询预算", () => {
  const page = fs.readFileSync("app/admin/reminders/page.tsx", "utf8");
  const summary = fs.readFileSync(
    "lib/admin-reminder-log-summary.ts",
    "utf8"
  );
  const filter = fs.readFileSync("lib/admin-reminder-filter.ts", "utf8");
  const exportRoute = fs.readFileSync(
    "app/api/admin/reminders/export/route.ts",
    "utf8"
  );

  it("默认页复用一次全局概览，只有筛选时执行 count", () => {
    expect(page).toContain("getAdminReminderLogSummary(todayStartUTC)");
    expect(page).toContain("hasAnyFilter");
    expect(page).toContain("Promise.resolve<number | null>(null)");
    expect(page).toContain("filteredCount ?? summary.totalCount");
  });

  it("全局概览用一次过滤聚合返回三项统计", () => {
    expect(summary).toContain('COUNT(*)::int AS "totalCount"');
    expect(summary).toContain('AS "totalToday"');
    expect(summary).toContain('AS "failedToday"');
    expect(summary).toContain('FROM "ReminderSent"');
  });

  it("手机号搜索直接使用关系过滤,不再预查 SIM ID", () => {
    expect(page).not.toContain("prisma.sim.findMany");
    expect(page).not.toContain("matchedSims");
    expect(filter).toContain("where.sim = { phoneNumber: { contains: query } }");
  });

  it("导出复用页面筛选且只读取 CSV 所需字段", () => {
    expect(exportRoute).toContain("buildReminderWhere({");
    expect(exportRoute).not.toContain("prisma.sim.findMany");
    expect(exportRoute).not.toContain("include:");
    expect(exportRoute).toContain("sim: { select: { phoneNumber: true } }");
  });
});
