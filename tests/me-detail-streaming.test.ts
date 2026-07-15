import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("号码详情流式加载", () => {
  const pageSource = fs.readFileSync("app/me/page.tsx", "utf8");

  it("数据库统计组件保持在独立 Suspense 边界内", () => {
    const suspenseStart = pageSource.indexOf("<Suspense");
    const simCard = pageSource.indexOf("<SimCard");
    const suspenseEnd = pageSource.indexOf("</Suspense>", suspenseStart);

    expect(pageSource).toContain("fallback={<SimCardLoading />}");
    expect(suspenseStart).toBeGreaterThan(-1);
    expect(simCard).toBeGreaterThan(suspenseStart);
    expect(simCard).toBeLessThan(suspenseEnd);
  });
});
