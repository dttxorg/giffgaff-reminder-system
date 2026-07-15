import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("后台主导航预取预算", () => {
  const desktop = fs.readFileSync(
    "app/admin/_components/admin-sidebar.tsx",
    "utf8"
  );
  const mobile = fs.readFileSync(
    "app/admin/_components/mobile-admin-nav.tsx",
    "utf8"
  );

  it("桌面和移动导航都关闭视口批量预取", () => {
    expect(desktop).toContain("prefetch={false}");
    expect(mobile).toContain("prefetch={false}");
  });

  it("两种导航都保留悬停/聚焦意图预取", () => {
    for (const source of [desktop, mobile]) {
      expect(source).toContain("router.prefetch(href)");
      expect(source).toContain("onMouseEnter={() => prefetchOnIntent(item.href)}");
      expect(source).toContain("onFocus={() => prefetchOnIntent(item.href)}");
    }
  });
});
