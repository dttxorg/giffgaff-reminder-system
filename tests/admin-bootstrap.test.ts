import { afterEach, describe, expect, it } from "vitest";
import { readAdminProvisioningCredentials } from "../lib/admin-bootstrap";

describe("readAdminProvisioningCredentials", () => {
  afterEach(() => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
  });

  it("不提供默认管理员凭据", () => {
    expect(() => readAdminProvisioningCredentials()).toThrow(
      "必须显式配置"
    );
  });

  it("拒绝短密码和常见弱密码", () => {
    process.env.ADMIN_USERNAME = "operator";
    process.env.ADMIN_PASSWORD = "admin123";
    expect(() => readAdminProvisioningCredentials()).toThrow("至少 12 位");
  });

  it("返回显式配置的强凭据", () => {
    process.env.ADMIN_USERNAME = "operator";
    process.env.ADMIN_PASSWORD = "Better-Admin-Password-2026!";
    expect(readAdminProvisioningCredentials()).toEqual({
      username: "operator",
      password: "Better-Admin-Password-2026!",
    });
  });
});
