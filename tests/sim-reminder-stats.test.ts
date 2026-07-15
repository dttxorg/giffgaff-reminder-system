import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  groupBy: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  prisma: {
    reminderSent: {
      findMany: dbMocks.findMany,
      groupBy: dbMocks.groupBy,
    },
  },
}));

import {
  getSimReminderStats,
  summarizeReminderPeriod,
} from "../lib/sim-reminder-stats";

const now = new Date("2026-07-15T04:00:00.000Z"); // 上海时间 7 月 15 日 12:00

describe("sim-reminder-stats", () => {
  beforeEach(() => {
    dbMocks.findMany.mockReset();
    dbMocks.groupBy.mockReset();
  });

  it("一次内存汇总生成今日、本月、小时和近 7 日数据", () => {
    const summary = summarizeReminderPeriod(
      [
        { sentAt: new Date("2026-07-15T01:00:00.000Z"), status: "success" },
        { sentAt: new Date("2026-07-15T03:00:00.000Z"), status: "failed" },
        { sentAt: new Date("2026-07-14T01:00:00.000Z"), status: "success" },
        { sentAt: new Date("2026-06-30T17:00:00.000Z"), status: "success" },
      ],
      now
    );

    expect(summary.todayCount).toBe(2);
    expect(summary.todayFailedCount).toBe(1);
    expect(summary.thisMonthCount).toBe(4);
    expect(summary.thisMonthFailedCount).toBe(1);
    expect(summary.todayHourlySends[9].count).toBe(1);
    expect(summary.todayHourlySends[11].count).toBe(1);
    expect(summary.last7DaysForSim.at(-1)?.count).toBe(2);
    expect(summary.last7DaysForSim.at(-2)?.count).toBe(1);
  });

  it("详情统计固定为 3 次并行查询，不再发起多轮 count", async () => {
    dbMocks.findMany
      .mockResolvedValueOnce([
        {
          id: 1,
          dayOffset: 175,
          bucket: 0,
          sentAt: new Date("2026-07-15T01:00:00.000Z"),
          status: "success",
        },
      ])
      .mockResolvedValueOnce([
        { sentAt: new Date("2026-07-15T01:00:00.000Z"), status: "success" },
      ]);
    dbMocks.groupBy.mockResolvedValueOnce([
      { status: "success", _count: { _all: 12 } },
      { status: "failed", _count: { _all: 2 } },
    ]);

    const result = await getSimReminderStats(88, now);

    expect(dbMocks.findMany).toHaveBeenCalledTimes(2);
    expect(dbMocks.groupBy).toHaveBeenCalledTimes(1);
    expect(result.lifetimeCount).toBe(14);
    expect(result.successCount).toBe(12);
    expect(result.failedCount).toBe(2);
    expect(result.recentReminders).toHaveLength(1);
  });
});
