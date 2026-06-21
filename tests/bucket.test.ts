import { describe, it, expect } from "vitest";
import { bucketForDay, dayOffsetFromBaseline, isInReminderWindow } from "../lib/bucket";

describe("bucketForDay", () => {
  it("返回 null 当 dayOffset 不在 170-180 范围", () => {
    expect(bucketForDay(0, 12)).toBeNull();
    expect(bucketForDay(169, 12)).toBeNull();
    expect(bucketForDay(181, 12)).toBeNull();
    expect(bucketForDay(-1, 12)).toBeNull();
  });

  it("170-172 每天 1 次,bucket 始终 0", () => {
    for (let d = 170; d <= 172; d++) {
      for (let h = 0; h < 24; h++) {
        expect(bucketForDay(d, h)).toEqual({ count: 1, bucket: 0 });
      }
    }
  });

  it("173-175 每天 2 次,2 个等长 12h 窗口", () => {
    for (const d of [173, 174, 175]) {
      expect(bucketForDay(d, 0)).toEqual({ count: 2, bucket: 0 });
      expect(bucketForDay(d, 11)).toEqual({ count: 2, bucket: 0 });
      expect(bucketForDay(d, 12)).toEqual({ count: 2, bucket: 1 });
      expect(bucketForDay(d, 23)).toEqual({ count: 2, bucket: 1 });
    }
  });

  it("176-178 每天 3 次,3 个等长 8h 窗口", () => {
    for (const d of [176, 177, 178]) {
      expect(bucketForDay(d, 0)).toEqual({ count: 3, bucket: 0 });
      expect(bucketForDay(d, 7)).toEqual({ count: 3, bucket: 0 });
      expect(bucketForDay(d, 8)).toEqual({ count: 3, bucket: 1 });
      expect(bucketForDay(d, 15)).toEqual({ count: 3, bucket: 1 });
      expect(bucketForDay(d, 16)).toEqual({ count: 3, bucket: 2 });
      expect(bucketForDay(d, 23)).toEqual({ count: 3, bucket: 2 });
    }
  });

  it("179 每天 5 次,5 个等长 4.8h 窗口", () => {
    expect(bucketForDay(179, 0)).toEqual({ count: 5, bucket: 0 });
    expect(bucketForDay(179, 4)).toEqual({ count: 5, bucket: 0 });
    expect(bucketForDay(179, 5)).toEqual({ count: 5, bucket: 1 });
    expect(bucketForDay(179, 9)).toEqual({ count: 5, bucket: 1 });
    expect(bucketForDay(179, 14)).toEqual({ count: 5, bucket: 2 });
    expect(bucketForDay(179, 19)).toEqual({ count: 5, bucket: 3 });
    expect(bucketForDay(179, 23)).toEqual({ count: 5, bucket: 4 });
  });

  it("180 每天 10 次,10 个等长 2.4h 窗口", () => {
    expect(bucketForDay(180, 0)).toEqual({ count: 10, bucket: 0 });
    expect(bucketForDay(180, 2)).toEqual({ count: 10, bucket: 0 });
    expect(bucketForDay(180, 3)).toEqual({ count: 10, bucket: 1 });
    expect(bucketForDay(180, 9)).toEqual({ count: 10, bucket: 3 });
    expect(bucketForDay(180, 23)).toEqual({ count: 10, bucket: 9 });
  });

  it("无效 hourOfDay 返回 null", () => {
    expect(bucketForDay(170, -1)).toBeNull();
    expect(bucketForDay(170, 24)).toBeNull();
  });
});

describe("dayOffsetFromBaseline", () => {
  it("返回正确的天数差", () => {
    const baseline = new Date("2026-01-15T00:00:00Z");
    const now = new Date("2026-01-25T00:00:00Z");
    expect(dayOffsetFromBaseline(baseline, now)).toBe(10);
  });

  it("now < baseline 返回负数", () => {
    const baseline = new Date("2026-01-25T00:00:00Z");
    const now = new Date("2026-01-15T00:00:00Z");
    expect(dayOffsetFromBaseline(baseline, now)).toBe(-10);
  });

  it("跨年计算", () => {
    const baseline = new Date("2025-12-30T00:00:00Z");
    const now = new Date("2026-01-05T00:00:00Z");
    expect(dayOffsetFromBaseline(baseline, now)).toBe(6);
  });
});

describe("isInReminderWindow", () => {
  it("在窗口内", () => {
    expect(isInReminderWindow(170)).toBe(true);
    expect(isInReminderWindow(175)).toBe(true);
    expect(isInReminderWindow(180)).toBe(true);
  });
  it("在窗口外", () => {
    expect(isInReminderWindow(0)).toBe(false);
    expect(isInReminderWindow(169)).toBe(false);
    expect(isInReminderWindow(181)).toBe(false);
  });
});
