import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("新增号码页面鉴权", () => {
  const source = fs.readFileSync("app/admin/sims/new/layout.tsx", "utf8");

  it("客户端表单外层仍由服务端 requireAdmin 保护", () => {
    expect(source).toContain("await requireAdmin()");
  });
});
