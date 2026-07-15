import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("后台列表默认分页复用概览统计", () => {
  const pages = [
    fs.readFileSync("app/admin/sims/page.tsx", "utf8"),
    fs.readFileSync("app/admin/users/page.tsx", "utf8"),
    fs.readFileSync("app/admin/cards/page.tsx", "utf8"),
  ];

  it("三页都只在存在筛选条件时执行过滤 count", () => {
    for (const page of pages) {
      expect(page).toContain("const hasFilters = Object.keys(where).length > 0");
      expect(page).toContain("Promise.resolve<number | null>(null)");
    }
  });

  it("三页默认态都从聚合结果推导分页总数", () => {
    expect(pages[0]).toContain("const totalCount = filteredCount ?? totalSims");
    expect(pages[1]).toContain("const totalCount = filteredCount ?? totalUsers");
    expect(pages[2]).toContain(
      "const filteredCount = filteredCountResult ?? totalCount"
    );
  });
});
