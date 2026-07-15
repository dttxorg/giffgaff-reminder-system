import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("首页非关键统计流式加载", () => {
  const pageSource = fs.readFileSync("app/page.tsx", "utf8");
  const statsSource = fs.readFileSync("app/_components/public-stats.tsx", "utf8");

  it("首页主体不再 await 数据库统计", () => {
    expect(pageSource).toContain("<Suspense");
    expect(pageSource).toContain("<PublicStats />");
    expect(pageSource).not.toContain("await getPublicStats");
    expect(pageSource).not.toContain('dynamic = "force-dynamic"');
  });

  it("公开统计使用 5 分钟数据缓存", () => {
    expect(statsSource).toContain("unstable_cache");
    expect(statsSource).toContain("revalidate: 300");
  });
});
