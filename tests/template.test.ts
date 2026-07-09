import { describe, it, expect } from "vitest";
import { renderTemplate, portUrl, DEFAULT_TEMPLATE } from "../lib/template";

describe("renderTemplate", () => {
  it("替换所有变量", () => {
    const tpl = "{{phone}} - {{days}} - {{port_url}}";
    const result = renderTemplate(tpl, {
      phone: "07724215611",
      days: 175,
      port_url: "https://example.com/p/1",
    });
    expect(result).toBe("07724215611 - 175 - https://example.com/p/1");
  });

  it("多次出现的变量全部替换", () => {
    const tpl = "{{phone}} and {{phone}}";
    const result = renderTemplate(tpl, { phone: "111", days: 1, port_url: "x" });
    expect(result).toBe("111 and 111");
  });

  it("缺变量时保留原样", () => {
    const tpl = "no vars here";
    const result = renderTemplate(tpl, { phone: "x", days: 1, port_url: "y" });
    expect(result).toBe("no vars here");
  });
});

describe("portUrl", () => {
  it("拼接保号页 URL (int id,向后兼容)", () => {
    expect(portUrl("https://example.com", 42)).toBe("https://example.com/p/42");
  });
  it("拼接保号页 URL (token 字符串,推荐)", () => {
    expect(portUrl("https://example.com", "abc123def456ghi789jkl012mno345pq"))
      .toBe("https://example.com/p/abc123def456ghi789jkl012mno345pq");
  });
  it("去尾部斜杠", () => {
    expect(portUrl("https://example.com/", 42)).toBe("https://example.com/p/42");
  });
  it("去多个尾部斜杠", () => {
    expect(portUrl("https://example.com///", 42)).toBe("https://example.com/p/42");
  });
});

describe("DEFAULT_TEMPLATE", () => {
  it("包含所有变量", () => {
    expect(DEFAULT_TEMPLATE).toContain("{{phone}}");
    expect(DEFAULT_TEMPLATE).toContain("{{days}}");
    expect(DEFAULT_TEMPLATE).toContain("{{port_url}}");
  });
});
