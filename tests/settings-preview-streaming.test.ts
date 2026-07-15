import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("设置页推送样例流式加载", () => {
  const source = fs.readFileSync("app/me/settings/page.tsx", "utf8");

  it("非关键 PushPreview 位于独立 Suspense 边界", () => {
    const suspenseStart = source.lastIndexOf("<Suspense");
    const preview = source.indexOf("<PushPreview", suspenseStart);
    const suspenseEnd = source.indexOf("</Suspense>", suspenseStart);

    expect(preview).toBeGreaterThan(suspenseStart);
    expect(preview).toBeLessThan(suspenseEnd);
    expect(source).toContain("正在加载推送样例");
  });
});
