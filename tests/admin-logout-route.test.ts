import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("管理员退出路由", () => {
  const source = fs.readFileSync("app/api/admin/auth/logout/route.ts", "utf8");

  it("原生表单退出后使用 303 返回登录页", () => {
    expect(source).toContain('new URL("/admin/login", request.url)');
    expect(source).toContain(", 303");
    expect(source).not.toContain("NextResponse.json");
  });
});
