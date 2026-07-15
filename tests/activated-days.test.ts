import { describe, it, expect } from "vitest";
import { formatActivatedDays } from "../lib/activated-days";

describe("formatActivatedDays — /me '已激活 N 天' 显示", () => {
  describe("0/1/2 边缘(刚激活)", () => {
    it("0 → 今天,fresh 模式,显示徽标", () => {
      expect(formatActivatedDays(0)).toEqual({
        text: "今天",
        showFreshBadge: true,
        mode: "fresh",
      });
    });
    it("1 → 昨天,fresh 模式,显示徽标", () => {
      expect(formatActivatedDays(1)).toEqual({
        text: "昨天",
        showFreshBadge: true,
        mode: "fresh",
      });
    });
    it("2 → 前天,fresh 模式,显示徽标", () => {
      expect(formatActivatedDays(2)).toEqual({
        text: "前天",
        showFreshBadge: true,
        mode: "fresh",
      });
    });
  });

  describe("3-169 普通激活期", () => {
    it("3 → 数字 3,正常模式,不显示徽标", () => {
      expect(formatActivatedDays(3)).toEqual({
        text: "3",
        showFreshBadge: false,
        mode: "normal",
      });
    });
    it("100 → 数字 100,正常模式", () => {
      expect(formatActivatedDays(100)).toEqual({
        text: "100",
        showFreshBadge: false,
        mode: "normal",
      });
    });
    it("169 → 数字 169(差 1 天进入窗口),正常模式", () => {
      expect(formatActivatedDays(169)).toEqual({
        text: "169",
        showFreshBadge: false,
        mode: "normal",
      });
    });
  });

  describe("170-180 提醒窗口内", () => {
    it("170 → 数字 170,inWindow 模式", () => {
      expect(formatActivatedDays(170)).toEqual({
        text: "170",
        showFreshBadge: false,
        mode: "inWindow",
      });
    });
    it("175 → 数字 175", () => {
      expect(formatActivatedDays(175).mode).toBe("inWindow");
    });
    it("180 → 数字 180", () => {
      expect(formatActivatedDays(180).mode).toBe("inWindow");
    });
  });

  describe("181+ 过窗口期", () => {
    it("181 → 数字 181,overdue 模式(红色提示用)", () => {
      expect(formatActivatedDays(181)).toEqual({
        text: "181",
        showFreshBadge: false,
        mode: "overdue",
      });
    });
    it("200 → overdue", () => {
      expect(formatActivatedDays(200).mode).toBe("overdue");
    });
  });

  describe("防御", () => {
    it("-5 (理论上不会出现)→ 归零,显示'今天'", () => {
      expect(formatActivatedDays(-5)).toEqual({
        text: "今天",
        showFreshBadge: true,
        mode: "fresh",
      });
    });
  });

  describe("1:N 多卡场景 — 每张卡独立计算", () => {
    it("同一天不同 sim,显示应独立(只是测函数纯度)", () => {
      const a = formatActivatedDays(50);
      const b = formatActivatedDays(50);
      expect(a).toEqual(b);
    });
    it("不同 sim 不同 dayOffset → 不同显示", () => {
      // sim A 刚激活 2 天, sim B 激活 100 天
      expect(formatActivatedDays(2).text).toBe("前天");
      expect(formatActivatedDays(100).text).toBe("100");
    });
  });
});
