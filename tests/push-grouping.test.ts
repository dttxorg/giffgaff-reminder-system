import { describe, it, expect } from "vitest";
import { groupRemindersByDay, type ReminderForGroup } from "../lib/push-grouping";

const make = (id: number, iso: string, overrides: Partial<ReminderForGroup> = {}): ReminderForGroup => ({
  id,
  sentAt: new Date(iso),
  status: "success",
  dayOffset: 100,
  bucket: 0,
  errorMessage: null,
  ...overrides,
});

describe("groupRemindersByDay", () => {
  it("空数组 → 空 groups", () => {
    expect(groupRemindersByDay([])).toEqual([]);
  });

  it("单个 reminder → 1 个 group", () => {
    const r = make(1, "2026-07-13T10:00:00Z");
    const groups = groupRemindersByDay([r]);
    expect(groups.length).toBe(1);
    expect(groups[0].dateKey).toBe("2026-07-13");
    expect(groups[0].reminders.length).toBe(1);
  });

  it("同一天多个 reminder → 1 个 group + 多 reminders", () => {
    const r1 = make(1, "2026-07-13T10:00:00Z");
    const r2 = make(2, "2026-07-13T15:00:00Z");
    const groups = groupRemindersByDay([r1, r2]);
    expect(groups.length).toBe(1);
    expect(groups[0].reminders.length).toBe(2);
  });

  it("不同天 → 多个 group", () => {
    const r1 = make(1, "2026-07-13T10:00:00Z");
    const r2 = make(2, "2026-07-14T10:00:00Z");
    const groups = groupRemindersByDay([r1, r2]);
    expect(groups.length).toBe(2);
    expect(groups[0].dateKey).toBe("2026-07-13");
    expect(groups[1].dateKey).toBe("2026-07-14");
  });

  it("上海时区换日 (UTC 15:00 = BJ 23:00 同日; UTC 17:00 = BJ 次日 01:00)", () => {
    // UTC 2026-07-13 15:00 = BJ 2026-07-13 23:00 → 同日
    const r1 = make(1, "2026-07-13T15:00:00Z");
    // UTC 2026-07-13 17:00 = BJ 2026-07-14 01:00 → 次日
    const r2 = make(2, "2026-07-13T17:00:00Z");
    const groups = groupRemindersByDay([r1, r2]);
    expect(groups.length).toBe(2);
    expect(groups[0].dateKey).toBe("2026-07-13");
    expect(groups[1].dateKey).toBe("2026-07-14");
  });

  it("label 格式: '2026年7月13日'", () => {
    const r = make(1, "2026-07-13T10:00:00Z");
    const groups = groupRemindersByDay([r]);
    expect(groups[0].label).toBe("2026年7月13日");
  });

  it("跨月 (2026-07-31 → 2026-08-01) 正确分组", () => {
    const r1 = make(1, "2026-07-31T15:00:00Z"); // BJ 同日
    const r2 = make(2, "2026-08-01T03:00:00Z"); // BJ 次日
    const groups = groupRemindersByDay([r1, r2]);
    expect(groups.length).toBe(2);
    expect(groups[0].dateKey).toBe("2026-07-31");
    expect(groups[1].dateKey).toBe("2026-08-01");
    expect(groups[1].label).toBe("2026年8月1日");
  });

  it("保持 reminders 内部顺序 (输入顺序,不是 sentAt 排序)", () => {
    // 注意:不重新排序,只分组。排序由 caller 负责 (orderBy sentAt desc)
    // UTC 10:00/12:00/14:00 都 = BJ 同一天 (10:00-22:00 北京时间)
    const r1 = make(1, "2026-07-13T10:00:00Z");
    const r2 = make(2, "2026-07-13T12:00:00Z");
    const r3 = make(3, "2026-07-13T14:00:00Z");
    const groups = groupRemindersByDay([r1, r2, r3]);
    expect(groups.length).toBe(1);
    expect(groups[0].reminders.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});
