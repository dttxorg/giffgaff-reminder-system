import { describe, it, expect } from "vitest";
import {
  generateRawCode,
  generateCardCode,
  normalizeCardCode,
  formatCardCode,
  isValidCardInput,
} from "../lib/card-key";

describe("generateRawCode", () => {
  it("生成 16 字符", () => {
    const code = generateRawCode();
    expect(code).toHaveLength(16);
  });

  it("只包含字符表字符（无 0/O/1/I/L/U/V）", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRawCode();
      expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTWXYZ]{16}$/);
    }
  });

  it("多次生成的码不重复", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      set.add(generateRawCode());
    }
    expect(set.size).toBe(1000); // 75 bit 熵, 1000 个不重复概率近 100%
  });
});

describe("generateCardCode", () => {
  it("格式 XXXX-XXXX-XXXX-XXXX", () => {
    const code = generateCardCode();
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("去连字符后长度 16", () => {
    const code = generateCardCode();
    expect(code.replace(/-/g, "")).toHaveLength(16);
  });
});

describe("normalizeCardCode", () => {
  it("去连字符", () => {
    expect(normalizeCardCode("7K9P-3R4M-8H2X-N5YQ")).toBe("7K9P3R4M8H2XN5YQ");
  });
  it("去空格 + 转大写", () => {
    expect(normalizeCardCode("7k9p 3r4m 8h2x n5yq")).toBe("7K9P3R4M8H2XN5YQ");
  });
  it("去非法字符（保留字符表）", () => {
    expect(normalizeCardCode("7K9P-3R4M-8H2X-N5YQ-extra!@#")).toBe(
      "7K9P3R4M8H2XN5YQEXTRA"
    );
  });
  it("空字符串", () => {
    expect(normalizeCardCode("")).toBe("");
  });
});

describe("formatCardCode", () => {
  it("原始码 → XXXX-XXXX-XXXX-XXXX", () => {
    expect(formatCardCode("7K9P3R4M8H2XN5YQ")).toBe("7K9P-3R4M-8H2X-N5YQ");
  });
  it("长度非 16 原样返回", () => {
    expect(formatCardCode("abc")).toBe("abc");
  });
});

describe("isValidCardInput", () => {
  it("合法输入", () => {
    expect(isValidCardInput("7K9P-3R4M-8H2X-N5YQ")).toBe(true);
    expect(isValidCardInput("7k9p3r4m8h2xn5yq")).toBe(true);
  });
  it("长度不够", () => {
    expect(isValidCardInput("7K9P-3R4M")).toBe(false);
  });
  it("空字符串", () => {
    expect(isValidCardInput("")).toBe(false);
  });
  it("含字符表外的字符", () => {
    expect(isValidCardInput("0O1ILUV7K9P3R4M8H2X")).toBe(false);
  });
});