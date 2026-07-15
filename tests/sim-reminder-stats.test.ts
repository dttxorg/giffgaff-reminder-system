import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  prisma: {
    $queryRaw: dbMocks.queryRaw,
  },
}));

import {
  getSimReminderStats,
  summarizeReminderPeriod,
  summarizeSimReminderStatsSnapshot,
} from "../lib/sim-reminder-stats";

const now = new Date("2026-07-15T04:00:00.000Z"); // 上海时间 7 月 15 日 12:00

describe("sim-reminder-stats", () => {
  beforeEach(() => {
    dbMocks.queryRaw.mockReset();
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

  it("从紧凑快照还原日期对象和生命周期计数", () => {
    const result = summarizeSimReminderStatsSnapshot(
      {
        recentReminders: [
          {
            id: 1,
            dayOffset: 175,
            bucket: 0,
            sentAt: "2026-07-15T01:00:00.000Z",
            status: "success",
          },
        ],
        periodReminders: [
          { sentAt: "2026-07-15T01:00:00.000Z", status: "success" },
        ],
        successCount: 12,
        failedCount: 2,
      },
      now
    );

    expect(result.lifetimeCount).toBe(14);
    expect(result.recentReminders[0].sentAt).toBeInstanceOf(Date);
    expect(result.todayCount).toBe(1);
  });

  it("详情统计固定为一次数据库快照查询", async () => {
    dbMocks.queryRaw.mockResolvedValueOnce([
      {
        recentReminders: [
          {
            id: 1,
            dayOffset: 175,
            bucket: 0,
            sentAt: "2026-07-15T01:00:00.000Z",
            status: "success",
          },
        ],
        periodReminders: [
          {
            sentAt: "2026-07-15T01:00:00.000Z",
            status: "success",
          },
        ],
        successCount: 12,
        failedCount: 2,
      },
    ]);

    const result = await getSimReminderStats(88, now);

    expect(dbMocks.queryRaw).toHaveBeenCalledOnce();
    expect(result.lifetimeCount).toBe(14);
    expect(result.successCount).toBe(12);
    expect(result.failedCount).toBe(2);
    expect(result.recentReminders).toHaveLength(1);
  });

  it("空快照返回完整的零值图表", async () => {
    dbMocks.queryRaw.mockResolvedValueOnce([
      {
        recentReminders: [],
        periodReminders: [],
        successCount: 0,
        failedCount: 0,
      },
    ]);

    const result = await getSimReminderStats(88, now);

    expect(result).toMatchObject({
      recentReminders: [],
      lifetimeCount: 0,
      successCount: 0,
      failedCount: 0,
      todayCount: 0,
      thisMonthCount: 0,
    });
    expect(result.todayHourlySends).toHaveLength(24);
    expect(result.last7DaysForSim).toHaveLength(7);
  });
});
