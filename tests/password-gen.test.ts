import { describe, it, expect } from "vitest";
import { generateSecurePassword } from "../lib/password-gen";

describe("generateSecurePassword", () => {
  it("默认长度 12", () => {
    const pw = generateSecurePassword();
    expect(pw).toHaveLength(12);
  });

  it("自定义长度", () => {
    expect(generateSecurePassword(8)).toHaveLength(8);
    expect(generateSecurePassword(20)).toHaveLength(20);
    expect(generateSecurePassword(32)).toHaveLength(32);
  });

  it("只包含给定字母表中的字符", () => {
    const alphabet = "abc123";
    const pw = generateSecurePassword(50, alphabet);
    for (const ch of pw) {
      expect(alphabet).toContain(ch);
    }
  });

  it("默认字母表不含易混字符 (0/1/I/O/l)", () => {
    const pw = generateSecurePassword(200);
    expect(pw).not.toMatch(/[01IlO]/);
  });

  it("连续生成 1000 次不重复（基本 sanity,实际碰撞概率极低）", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      set.add(generateSecurePassword());
    }
    expect(set.size).toBe(1000);
  });

  it("长度 < 1 抛错", () => {
    expect(() => generateSecurePassword(0)).toThrow();
    expect(() => generateSecurePassword(-1)).toThrow();
  });

  it("字母表 < 2 字符抛错", () => {
    expect(() => generateSecurePassword(8, "a")).toThrow();
    expect(() => generateSecurePassword(8, "")).toThrow();
  });
});
