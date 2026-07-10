import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../lib/auth";

describe("hashPassword / verifyPassword", () => {
  it("正确密码验证通过", async () => {
    const hash = await hashPassword("hello-world-123");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("hello-world-123", hash)).toBe(true);
  });

  it("错误密码验证失败", async () => {
    const hash = await hashPassword("correct-password");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("空字符串不匹配", async () => {
    const hash = await hashPassword("non-empty");
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("同密码两次哈希不同（盐不同）", async () => {
    const h1 = await hashPassword("same-password");
    const h2 = await hashPassword("same-password");
    expect(h1).not.toBe(h2);
    expect(await verifyPassword("same-password", h1)).toBe(true);
    expect(await verifyPassword("same-password", h2)).toBe(true);
  });

  it("损坏的 hash 返回 false", async () => {
    expect(await verifyPassword("any", "not-a-valid-hash")).toBe(false);
    expect(await verifyPassword("any", "scrypt$1$2$3$xxx$yyy")).toBe(false);
  });

  it("哈希耗时合理（scrypt 应该至少 20ms）", async () => {
    const t0 = Date.now();
    await hashPassword("benchmark");
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(20);
  });
});

import { checkCronAuth, generateVerificationCode, generateId } from "../lib/auth";

describe("checkCronAuth", () => {
  it("CRON_SECRET 未设置 → 返回 true(本地调试模式)", () => {
    const orig = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    expect(checkCronAuth(new Request("http://x"))).toBe(true);
    if (orig) process.env.CRON_SECRET = orig;
  });

  it("CRON_SECRET 设置 + header 匹配 → true", () => {
    process.env.CRON_SECRET = "my-secret";
    const req = new Request("http://x", {
      headers: { authorization: "Bearer my-secret" },
    });
    expect(checkCronAuth(req)).toBe(true);
  });

  it("CRON_SECRET 设置 + header 缺失 → false", () => {
    process.env.CRON_SECRET = "my-secret";
    const req = new Request("http://x");
    expect(checkCronAuth(req)).toBe(false);
  });

  it("CRON_SECRET 设置 + header 不匹配 → false", () => {
    process.env.CRON_SECRET = "my-secret";
    const req = new Request("http://x", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    expect(checkCronAuth(req)).toBe(false);
  });

  it("CRON_SECRET 设置 + 缺 Bearer 前缀 → false", () => {
    process.env.CRON_SECRET = "my-secret";
    const req = new Request("http://x", {
      headers: { authorization: "my-secret" },
    });
    expect(checkCronAuth(req)).toBe(false);
  });
});

describe("generateVerificationCode", () => {
  it("生成 6 位数字字符串", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("100 次生成不重复", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) codes.add(generateVerificationCode());
    expect(codes.size).toBe(100);
  });
});

describe("generateId", () => {
  it("生成 32 字符 hex(16 字节)", () => {
    for (let i = 0; i < 20; i++) {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it("两次生成不同", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) set.add(generateId());
    expect(set.size).toBe(1000);
  });
});
