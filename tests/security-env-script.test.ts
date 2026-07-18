import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const requiredEnv = {
  ...process.env,
  CRON_SECRET: "0123456789abcdef0123456789abcdef",
  ADMIN_USERNAME: "security-admin",
  ADMIN_PASSWORD: "Strong-Admin-Passphrase-2026!",
};

describe("生产安全环境校验脚本", () => {
  it("MFA 与 PUBLIC_BASE_URL 未配置时允许使用安全默认值部署", () => {
    const result = spawnSync(process.execPath, ["scripts/validate-security-env.mjs"], {
      cwd: process.cwd(),
      env: {
        ...requiredEnv,
        ADMIN_TOTP_SECRET: "",
        PUBLIC_BASE_URL: "",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("MFA=optional/not configured");
    expect(result.stdout).toContain("https://baohao.681218.xyz");
  });

  it("显式提供无效 MFA 密钥时拒绝部署", () => {
    const result = spawnSync(process.execPath, ["scripts/validate-security-env.mjs"], {
      cwd: process.cwd(),
      env: {
        ...requiredEnv,
        ADMIN_TOTP_SECRET: "invalid-secret",
        PUBLIC_BASE_URL: "",
      },
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("ADMIN_TOTP_SECRET");
  });
});
