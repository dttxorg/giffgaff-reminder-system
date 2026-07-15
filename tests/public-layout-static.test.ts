import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("公共根布局保持静态", () => {
  const layoutSource = fs.readFileSync("app/layout.tsx", "utf8");
  const navSource = fs.readFileSync("app/_components/user-nav.tsx", "utf8");

  it("根布局不直接读取用户 session", () => {
    expect(layoutSource).not.toContain("getCurrentUser");
    expect(layoutSource).not.toContain("cookies(");
    expect(layoutSource).toContain("<UserNav />");
  });

  it("导航登录态在客户端首屏后获取", () => {
    expect(navSource).toContain('"use client"');
    expect(navSource).toContain('fetch("/api/auth/session"');
  });
});
