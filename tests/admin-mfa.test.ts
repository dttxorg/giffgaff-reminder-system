import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adminMfaConfigurationValid,
  verifyAdminTotp,
} from "../lib/admin-mfa";

function expectedOtp(secret: Buffer, nowMs: number): string {
  const counter = Math.floor(nowMs / 1000 / 30);
  const input = Buffer.alloc(8);
  input.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(input).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000)
    .toString()
    .padStart(6, "0");
}

describe("admin TOTP", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("生产环境缺失 TOTP 密钥时配置无效并拒绝登录", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(adminMfaConfigurationValid()).toBe(false);
    expect(verifyAdminTotp("123456")).toBe(false);
  });

  it("验证当前时间窗口的 6 位 TOTP", () => {
    vi.stubEnv("NODE_ENV", "production");
    const secret = Buffer.from("12345678901234567890");
    vi.stubEnv("ADMIN_TOTP_SECRET", "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    const now = 1_700_000_000_000;
    expect(verifyAdminTotp(expectedOtp(secret, now), now)).toBe(true);
    expect(verifyAdminTotp("000000", now)).toBe(false);
  });
});
