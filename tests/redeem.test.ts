import { describe, it, expect } from "vitest";
import { parseDate, isValidPhone } from "../lib/redeem";

describe("parseDate", () => {
  it("合法日期 → UTC 0:00", () => {
    const r = parseDate("2026-07-10");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.date.toISOString()).toBe("2026-07-10T00:00:00.000Z");
  });

  it("闰年 2-29 → 合法", () => {
    const r = parseDate("2024-02-29");
    expect(r.ok).toBe(true);
  });

  it("非闰年 2-29 → 拒绝(2025-02-29 不存在)", () => {
    const r = parseDate("2025-02-29");
    expect(r.ok).toBe(false);
  });

  it("2-30 永远不存在 → 拒绝", () => {
    expect(parseDate("2026-02-30").ok).toBe(false);
    expect(parseDate("2024-02-30").ok).toBe(false);
  });

  it("4-31 永远不存在 → 拒绝", () => {
    expect(parseDate("2026-04-31").ok).toBe(false);
  });

  it("月份 13 → 拒绝", () => {
    expect(parseDate("2026-13-01").ok).toBe(false);
  });

  it("月份 00 → 拒绝", () => {
    expect(parseDate("2026-00-15").ok).toBe(false);
  });

  it("日 00 → 拒绝", () => {
    expect(parseDate("2026-07-00").ok).toBe(false);
  });

  it("空字符串 → 拒绝", () => {
    expect(parseDate("").ok).toBe(false);
  });

  it("格式错(斜线)→ 拒绝", () => {
    expect(parseDate("2026/07/10").ok).toBe(false);
  });

  it("格式错(8 位数字无连字符)→ 拒绝", () => {
    expect(parseDate("20260710").ok).toBe(false);
  });

  it("非数字 → 拒绝", () => {
    expect(parseDate("abcd-ef-gh").ok).toBe(false);
  });

  it("带时间部分 → 拒绝(只接受 yyyy-MM-dd)", () => {
    expect(parseDate("2026-07-10T00:00:00Z").ok).toBe(false);
  });

  it("2020-12-31 跨年 → 合法", () => {
    const r = parseDate("2020-12-31");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.date.toISOString()).toBe("2020-12-31T00:00:00.000Z");
    }
  });
});

describe("isValidPhone", () => {
  it("7 位(后 6 位 + 国码 1 位)→ 合法", () => {
    expect(isValidPhone("7242156")).toBe(true); // 6 位,合法(下限)
    expect(isValidPhone("772421561")).toBe(true); // 9 位,合法
  });

  it("6 位 → 拒绝", () => {
    // regex 是 {6,15},6 位是合法下限,所以这里不能是 6 位
    expect(isValidPhone("12345")).toBe(false); // 5 位,拒绝
  });

  it("15 位 → 合法", () => {
    expect(isValidPhone("123456789012345")).toBe(true);
  });

  it("16 位 → 拒绝", () => {
    expect(isValidPhone("1234567890123456")).toBe(false);
  });

  it("含横线 / 空格 → 拒绝(应先 normalize)", () => {
    expect(isValidPhone("07724 215611")).toBe(false);
    expect(isValidPhone("07724-215611")).toBe(false);
    expect(isValidPhone("(077) 242-15611")).toBe(false);
  });

  it("含字母 → 拒绝", () => {
    expect(isValidPhone("abc12345")).toBe(false);
    expect(isValidPhone("12345abc")).toBe(false);
  });

  it("空字符串 → 拒绝", () => {
    expect(isValidPhone("")).toBe(false);
  });

  it("中国手机号(11 位 1 开头)→ 合法", () => {
    expect(isValidPhone("13800138000")).toBe(true);
  });

  it("Giffgaff 11 位号码 → 合法", () => {
    expect(isValidPhone("07724215611")).toBe(true);
  });
});
