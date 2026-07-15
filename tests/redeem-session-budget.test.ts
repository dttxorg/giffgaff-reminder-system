import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("兑换提交 Session 预算", () => {
  const source = fs.readFileSync("app/api/redeem/route.ts", "utf8");

  it("只读取当前 userId，不加载完整账号和 SIM 列表", () => {
    expect(source).toContain("getCurrentUserId()");
    expect(source).not.toContain("getCurrentUser()");
  });
});
