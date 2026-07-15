import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("管理仪表盘查询预算", () => {
  const source = fs.readFileSync("app/admin/page.tsx", "utf8");

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
});
