import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("管理仪表盘查询预算", () => {
  const source = fs.readFileSync("app/admin/page.tsx", "utf8");
  const data = fs.readFileSync("lib/admin-dashboard-data.ts", "utf8");

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

  it("提醒数据只读取近 90 天和渲染所需字段", () => {
    expect(data).toContain("const reminderStart");
    expect(data).toContain("where: { sentAt: { gte: reminderStart } }");
    expect(data).toContain("channel: true");
    expect(data).not.toContain("getAdminDashboardReminderSnapshot");
  });

  it("用户只读取创建时间供总数与 7 日趋势汇总", () => {
    expect(data).toContain(
      "prisma.user.findMany({ select: { createdAt: true } })"
    );
    expect(data).not.toContain("getAdminDashboardUserSnapshot");
  });

  it("SIM 查询只读取汇总和排行所需字段", () => {
    expect(data).toContain("prisma.sim.findMany({");
    expect(data).toContain("channelKey: true");
    expect(data).toContain("user: { select: { createdAt: true } }");
    expect(data).not.toContain("getAdminDashboardSimSnapshot");
  });

  it("查询失败必须传播给错误边界，禁止返回伪造零值", () => {
    expect(data).not.toContain("loadDashboardSection");
    expect(data).not.toContain("EMPTY_ADMIN_");
  });
});
