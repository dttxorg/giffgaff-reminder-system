import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("兑换页静态外壳", () => {
  const source = fs.readFileSync("app/redeem/page.tsx", "utf8");

  it("页面不在服务端读取 session 或 searchParams", () => {
    expect(source).toContain("<Suspense");
    expect(source).toContain("<RedeemExperience />");
    expect(source).not.toContain("getCurrentUser");
    expect(source).not.toContain("searchParams:");
  });
});
