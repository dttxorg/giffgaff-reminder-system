import { describe, expect, it } from "vitest";
import {
  filterAndSortSimManagerItems,
  formatSimTiming,
  getSimAttention,
  getSimManagerCounts,
  pickDefaultManagedSim,
  sortSimManagerItems,
  type SimManagerItemBase,
} from "../lib/sim-manager";

function sim(
  id: number,
  overrides: Partial<SimManagerItemBase> = {}
): SimManagerItemBase {
  return {
    id,
    phoneNumber: `0772400${String(id).padStart(4, "0")}`,
    status: "active",
    missingChannel: false,
    dayOffset: 100,
    createdAt: new Date(2026, 0, id).toISOString(),
    ...overrides,
  };
}

describe("sim-manager", () => {
  it("状态优先级为已超期 → 窗口内 → 未配置 → 正常 → 暂停", () => {
    expect(getSimAttention(sim(1, { dayOffset: 181 }))).toBe("overdue");
    expect(getSimAttention(sim(2, { dayOffset: 175 }))).toBe("window");
    expect(getSimAttention(sim(3, { missingChannel: true }))).toBe("missing");
    expect(getSimAttention(sim(4))).toBe("normal");
    expect(getSimAttention(sim(5, { status: "paused", dayOffset: 200 }))).toBe("paused");
  });

  it("紧急优先排序，同级内 dayOffset 更大的在前", () => {
    const sorted = sortSimManagerItems(
      [
        sim(1),
        sim(2, { status: "paused", dayOffset: 200 }),
        sim(3, { dayOffset: 173 }),
        sim(4, { dayOffset: 185 }),
        sim(5, { missingChannel: true }),
        sim(6, { dayOffset: 179 }),
      ],
      "priority"
    );

    expect(sorted.map((item) => item.id)).toEqual([4, 6, 3, 5, 1, 2]);
  });

  it("默认号码使用紧急排序的第一项", () => {
    const picked = pickDefaultManagedSim([
      sim(1),
      sim(2, { dayOffset: 180 }),
      sim(3, { dayOffset: 184 }),
    ]);
    expect(picked?.id).toBe(3);
    expect(pickDefaultManagedSim([])).toBeNull();
  });

  it("统计全部、需处理、窗口、未配置和暂停数量", () => {
    const counts = getSimManagerCounts([
      sim(1, { dayOffset: 181 }),
      sim(2, { dayOffset: 175 }),
      sim(3, { missingChannel: true }),
      sim(4, { status: "paused", missingChannel: true }),
      sim(5),
    ]);

    expect(counts).toEqual({ all: 5, attention: 3, window: 1, missing: 2, paused: 1 });
  });

  it("搜索、状态筛选和排序可以组合", () => {
    const items = [
      sim(1, { phoneNumber: "0772411115611", missingChannel: true }),
      sim(2, { phoneNumber: "0772422225611", dayOffset: 175 }),
      sim(3, { phoneNumber: "0772433330000", status: "paused" }),
    ];

    expect(
      filterAndSortSimManagerItems(items, "5611", "attention", "priority").map((item) => item.id)
    ).toEqual([2, 1]);
    expect(filterAndSortSimManagerItems(items, "", "paused", "number").map((item) => item.id)).toEqual([3]);
  });

  it("生成列表使用的截止时间文案", () => {
    expect(formatSimTiming(sim(1, { dayOffset: 190 }))).toBe("已超期 10 天");
    expect(formatSimTiming(sim(2, { dayOffset: 180 }))).toBe("今天截止");
    expect(formatSimTiming(sim(3, { dayOffset: 176 }))).toBe("距截止 4 天");
    expect(formatSimTiming(sim(4, { dayOffset: 100 }))).toBe("距提醒 70 天");
    expect(formatSimTiming(sim(5, { status: "paused" }))).toBe("已暂停监控");
  });
});
