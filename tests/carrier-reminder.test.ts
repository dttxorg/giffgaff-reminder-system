import { describe, expect, it } from "vitest";
import {
  bucketForDay,
  daysUntilReminderWindow,
  isInReminderWindow,
  reminderCountForDay,
} from "../lib/bucket";
import { CARRIER_POLICIES, reminderPolicy } from "../lib/carrier";
import {
  formatSimTiming,
  sortSimManagerItems,
  type SimManagerItemBase,
} from "../lib/sim-manager";

describe("运营商预设与自定义提醒周期", () => {
  it("提供 Giffgaff 170/180 与 CTExcel 80/90 默认值", () => {
    expect(CARRIER_POLICIES.giffgaff).toMatchObject({
      reminderStartDay: 170,
      cycleDays: 180,
    });
    expect(CARRIER_POLICIES.ctexcel).toMatchObject({
      reminderStartDay: 80,
      cycleDays: 90,
    });
  });

  it("CTExcel 在 80 天开始、90 天截止，并沿用同一加密节奏", () => {
    expect(bucketForDay(79, 12, "ctexcel")).toBeNull();
    expect(bucketForDay(80, 12, "ctexcel")).toMatchObject({ count: 1 });
    expect(bucketForDay(83, 12, "ctexcel")).toMatchObject({ count: 2 });
    expect(bucketForDay(86, 12, "ctexcel")).toMatchObject({ count: 3 });
    expect(bucketForDay(89, 12, "ctexcel")).toMatchObject({ count: 5 });
    expect(bucketForDay(90, 12, "ctexcel")).toMatchObject({ count: 10 });
    expect(bucketForDay(91, 12, "ctexcel")).toBeNull();
  });

  it("自定义窗口超过 10 天时从自定义开始日持续提醒，最后 7 天逐步加密", () => {
    const custom = {
      carrier: "ctexcel" as const,
      reminderStartDay: 60,
      cycleDays: 90,
    };
    expect(reminderCountForDay(59, custom)).toBe(0);
    expect(reminderCountForDay(60, custom)).toBe(1);
    expect(reminderCountForDay(82, custom)).toBe(1);
    expect(reminderCountForDay(83, custom)).toBe(2);
    expect(reminderCountForDay(86, custom)).toBe(3);
    expect(reminderCountForDay(89, custom)).toBe(5);
    expect(reminderCountForDay(90, custom)).toBe(10);
    expect(isInReminderWindow(60, custom)).toBe(true);
    expect(daysUntilReminderWindow(59, custom)).toEqual({
      kind: "before",
      days: 1,
    });
    expect(reminderPolicy(custom)).toMatchObject({
      id: "ctexcel",
      reminderStartDay: 60,
      cycleDays: 90,
    });
  });
});

describe("混合运营商号码紧急度", () => {
  const base = {
    phoneNumber: "07724000000",
    status: "active" as const,
    missingChannel: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("按距各自截止日排序，不直接比较已激活天数", () => {
    const sims: SimManagerItemBase[] = [
      {
        ...base,
        id: 1,
        dayOffset: 175,
        carrier: "giffgaff",
        reminderStartDay: 170,
        cycleDays: 180,
      },
      {
        ...base,
        id: 2,
        dayOffset: 89,
        carrier: "ctexcel",
        reminderStartDay: 80,
        cycleDays: 90,
      },
    ];
    expect(sortSimManagerItems(sims, "priority").map((sim) => sim.id)).toEqual([
      2, 1,
    ]);
    expect(formatSimTiming(sims[1])).toBe("距截止 1 天");
  });
});
