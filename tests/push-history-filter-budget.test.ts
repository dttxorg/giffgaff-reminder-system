import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("推送历史筛选预算", () => {
  const source = fs.readFileSync("app/me/pushes/page.tsx", "utf8");

  it("不再渲染重复的 90 天 / 3 个月入口和占位清除链接", () => {
    expect(source).not.toContain("_3monthsAgo");
    expect(source).not.toContain("清除 status");
    expect(source).not.toContain('className={`px-2 py-1 rounded ${status ?');
  });

  it("筛选链接统一关闭动态路由预取", () => {
    expect(source).toContain("HistoryFilterLink");
    const component = fs.readFileSync(
      "app/me/_components/history-filter-link.tsx",
      "utf8"
    );
    expect(component).toContain("prefetch={false}");
  });
});
