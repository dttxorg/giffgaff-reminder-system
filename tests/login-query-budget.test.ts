import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("登录查询预算", () => {
  const userLogin = fs.readFileSync("app/api/auth/login/route.ts", "utf8");
  const adminLogin = fs.readFileSync(
    "app/api/admin/auth/login/route.ts",
    "utf8"
  );

  it("用户登录只读取必要账号字段和未配置渠道数量", () => {
    expect(userLogin).toContain("_count:");
    expect(userLogin).toContain('where: { channelKey: "" }');
    expect(userLogin).not.toContain("include: { sims:");
  });

  it("用户登录成功后的更新与 Session 创建并行", () => {
    expect(userLogin).toContain("await Promise.all([");
    expect(userLogin).toContain("createUserSession(user.id)");
  });

  it("管理员登录复用初始化查询结果，不再二次 findUnique", () => {
    expect(adminLogin).toContain("const admin = await ensureDefaultAdmin()");
    expect(adminLogin).not.toContain("prisma.adminUser.findUnique");
  });
});
