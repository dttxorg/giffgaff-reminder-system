import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("管理仪表盘查询预算", () => {
  const source = fs.readFileSync("app/admin/page.tsx", "utf8");
  const data = fs.readFileSync("lib/admin-dashboard-data.ts", "utf8");
  const snapshot = fs.readFileSync(
    "lib/admin-dashboard-reminder-snapshot.ts",
    "utf8"
  );
  const userSnapshot = fs.readFileSync(
    "lib/admin-dashboard-user-snapshot.ts",
    "utf8"
  );

  it("页面只通过统一快照加载数据，不再逐卡片调用统计查询", () => {
    expect(source).toContain("getAdminDashboardData(now)");
    expect(source).not.toContain("prisma.");
    expect(source).not.toContain("getLast90DaysSends");
    expect(source).not.toContain("getTopActiveSims(");
  });

  it("核心指标区只展示有真实数据的卡片", () => {
    expect(source).not.toContain('label="卡密未用" value={undefined}');
    expect(source).toContain("lg:grid-cols-4");
  });

  it("90 天提醒指标使用数据库聚合快照,不再回传逐条日志", () => {
    expect(data).toContain("getAdminDashboardReminderSnapshot(now)");
    expect(data).not.toContain("const reminderStart");
    expect(snapshot).toContain("WITH reminder_base AS MATERIALIZED");
    expect(snapshot).toContain("jsonb_agg");
    expect(snapshot).toContain('GROUP BY "simId"');
  });

  it("用户总数与 7 日趋势使用单行聚合,不再回传全部用户", () => {
    expect(data).toContain("getAdminDashboardUserSnapshot(now)");
    expect(data).not.toContain("prisma.user.findMany");
    expect(userSnapshot).toContain('COUNT(*)::int AS "totalCount"');
    expect(userSnapshot).toContain("jsonb_build_array(");
  });
});
