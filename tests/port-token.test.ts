import { describe, it, expect } from "vitest";
import { generatePortToken, looksLikeToken } from "../lib/port-token";

describe("generatePortToken", () => {
  it("生成 32 字符 token", () => {
    const token = generatePortToken();
    expect(token).toHaveLength(32);
  });

  it("只包含 url-safe 字符(字母数字 + - + _)", () => {
    for (let i = 0; i < 20; i++) {
      const token = generatePortToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("不包含 url-unsafe 字符(+,/,=)", () => {
    for (let i = 0; i < 50; i++) {
      const token = generatePortToken();
      expect(token).not.toMatch(/[+/=]/);
    }
  });

  it("1000 次生成的 token 都不重复(碰撞极罕见)", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      set.add(generatePortToken());
    }
    expect(set.size).toBe(1000);
  });

  it("每个 token 都能通过 looksLikeToken", () => {
    for (let i = 0; i < 50; i++) {
      const token = generatePortToken();
      expect(looksLikeToken(token)).toBe(true);
    }
  });
});

describe("looksLikeToken", () => {
  it("纯数字(老 int id)→ false", () => {
    expect(looksLikeToken("42")).toBe(false);
    expect(looksLikeToken("1234567890")).toBe(false);
  });

  it("字母 + 数字 长度 32+ → true", () => {
    expect(looksLikeToken("abc123def456ghi789jkl012mno345pq")).toBe(true);
    expect(looksLikeToken("ABCDEFGHIJKLMNOPQRSTUVWXYZ123456")).toBe(true);
  });

  it("含 url-unsafe 字符(+,/,=)→ false", () => {
    expect(looksLikeToken("abc+def456ghi789")).toBe(false);
    expect(looksLikeToken("abc/def456ghi789")).toBe(false);
    expect(looksLikeToken("abc=def456ghi789")).toBe(false);
  });

  it("含其他特殊字符 → false", () => {
    expect(looksLikeToken("abc def456ghi789")).toBe(false);
    expect(looksLikeToken("abc.def456ghi789")).toBe(false);
    expect(looksLikeToken("abc@def456ghi789")).toBe(false);
  });

  it("太短(< 32 字符)→ false", () => {
    expect(looksLikeToken("abc123")).toBe(false);
    expect(looksLikeToken("")).toBe(false);
  });

  it("太长(> 64 字符)→ false", () => {
    const long = "a".repeat(65);
    expect(looksLikeToken(long)).toBe(false);
  });

  it("边界长度(32 / 64)→ true", () => {
    expect(looksLikeToken("a".repeat(32))).toBe(true);
    expect(looksLikeToken("a".repeat(64))).toBe(true);
  });

  it("含横线 / 下划线 → true", () => {
    expect(looksLikeToken("abc-def_ghi7890123456789012345678")).toBe(true);
    expect(looksLikeToken("_".repeat(32))).toBe(true);
  });

  it("空字符串 → false", () => {
    expect(looksLikeToken("")).toBe(false);
  });
});
