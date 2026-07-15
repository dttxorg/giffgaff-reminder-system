import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("管理登录页静态外壳", () => {
  const layoutSource = fs.readFileSync("app/admin/layout.tsx", "utf8");

  it("admin layout 不再读取 session 或等待数据库", () => {
    expect(layoutSource).not.toContain("getAdminSession");
    expect(layoutSource).not.toContain("async function AdminLayout");
    expect(layoutSource).toContain("<AdminShell>");
  });
});
