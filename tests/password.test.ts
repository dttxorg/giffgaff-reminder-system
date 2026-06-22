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
