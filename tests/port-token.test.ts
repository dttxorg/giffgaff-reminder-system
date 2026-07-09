import { describe, it, expect } from "vitest";
import { generatePortToken, looksLikeToken } from "../lib/port-token";

describe("generatePortToken", () => {
  it("返回 32 字符 url-safe 字符串", () => {
    const t = generatePortToken();
    expect(t).toHaveLength(32);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("不包含 url-unsafe 字符 (+ / =)", () => {
    for (let i = 0; i < 50; i++) {
      const t = generatePortToken();
      expect(t).not.toMatch(/[+/=]/);
    }
  });

  it("每次生成都不同 (1000 次无碰撞)", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      set.add(generatePortToken());
    }
    expect(set.size).toBe(1000);
  });
});

describe("looksLikeToken", () => {
  it("接受 32 字符 url-safe token", () => {
    expect(looksLikeToken(generatePortToken())).toBe(true);
  });

  it("接受其他长度的 url-safe 字符串(16-64)", () => {
    expect(looksLikeToken("abcd1234abcd1234")).toBe(true);
    expect(looksLikeToken("a".repeat(64))).toBe(true);
  });

  it("拒绝太短 (< 16)", () => {
    expect(looksLikeToken("abc")).toBe(false);
    expect(looksLikeToken("123456789012345")).toBe(false); // 15 字符
  });

  it("拒绝太长 (> 64)", () => {
    expect(looksLikeToken("a".repeat(65))).toBe(false);
  });

  it("拒绝含 url-unsafe 字符", () => {
    expect(looksLikeToken("abcd1234abcd1234+")).toBe(false);
    expect(looksLikeToken("abcd1234abcd1234/")).toBe(false);
    expect(looksLikeToken("abcd1234abcd1234=")).toBe(false);
  });

  it("拒绝纯数字串(老 int id),确保向后兼容逻辑正确", () => {
    // 关键: 纯数字必须返回 false,这样 findSimByParam 会走 id 查找
    expect(looksLikeToken("1")).toBe(false);
    expect(looksLikeToken("42")).toBe(false);
    expect(looksLikeToken("1234567890")).toBe(false);
  });

  it("接受含字母的混合串", () => {
    expect(looksLikeToken("abc123def456ghi7")).toBe(true);
    expect(looksLikeToken("X-_abc123def456ghi")).toBe(true);
  });
});
