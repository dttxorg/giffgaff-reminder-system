import { describe, it, expect } from "vitest";
import { normalizePhone, extractLookupKey, toLookupKey, formatPhoneForDisplay } from "../lib/phone";

describe("normalizePhone", () => {
  it("去空格", () => {
    expect(normalizePhone("07724 215611")).toBe("07724215611");
  });
  it("去横线", () => {
    expect(normalizePhone("07724-215-611")).toBe("07724215611");
  });
  it("去字母", () => {
    expect(normalizePhone("+44 7724 215 611")).toBe("447724215611");
  });
  it("空字符串", () => {
    expect(normalizePhone("")).toBe("");
  });
});

describe("extractLookupKey", () => {
  it("取后 6 位", () => {
    expect(extractLookupKey("07724215611")).toBe("215611");
  });
  it("不足 6 位返回 null", () => {
    expect(extractLookupKey("12345")).toBeNull();
    expect(extractLookupKey("")).toBeNull();
  });
});

describe("toLookupKey", () => {
  it("归一化 + 取后 6 位", () => {
    expect(toLookupKey("07724 215611")).toBe("215611");
    expect(toLookupKey("+44 7724 215-611")).toBe("215611");
  });
  it("去空格后不足 6 位返回 null", () => {
    expect(toLookupKey("123 abc")).toBeNull();
  });
});

describe("formatPhoneForDisplay", () => {
  it("5+6 格式加空格", () => {
    expect(formatPhoneForDisplay("07724215611")).toBe("07724 215611");
  });
  it("短于 5 位不加空格", () => {
    expect(formatPhoneForDisplay("1234")).toBe("1234");
  });
});
