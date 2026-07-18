import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("authentication security invariants", () => {
  const userLogin = fs.readFileSync("app/api/auth/login/route.ts", "utf8");
  const adminLogin = fs.readFileSync(
    "app/api/admin/auth/login/route.ts",
    "utf8"
  );
  const testPush = fs.readFileSync("app/api/auth/test-push/route.ts", "utf8");

  it("用户登录不公开剩余次数或使用可被他人触发的账号锁定", () => {
    expect(userLogin).not.toContain("还可尝试");
    expect(userLogin).not.toContain("账号已锁定");
    expect(userLogin).toContain("DUMMY_PASSWORD_HASH");
    expect(userLogin).toContain("user-login-ip");
  });

  it("管理员登录要求持久限流与 MFA，不自动创建账号", () => {
    expect(adminLogin).toContain("admin-login-ip");
    expect(adminLogin).toContain("verifyAdminTotp");
    expect(adminLogin).not.toContain("ensureDefaultAdmin");
  });

  it("测试推送要求用户 Session 且不使用实例内 Map 限流", () => {
    expect(testPush).toContain("getCurrentUserId");
    expect(testPush).not.toContain("lastCallMap");
  });
});
