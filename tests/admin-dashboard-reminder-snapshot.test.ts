import { describe, expect, it } from "vitest";
import {
  summarizeAdminReminderSnapshot,
  type AdminDashboardReminderSnapshot,
} from "../lib/admin-dashboard-reminder-snapshot";

const now = new Date("2026-07-15T04:00:00.000Z");

describe("admin dashboard reminder snapshot", () => {
  it("从紧凑计数还原趋势、渠道和 SIM 排行", () => {
    const snapshot: AdminDashboardReminderSnapshot = {
      daily: [
        { dayIndex: 88, count: 1 },
        { dayIndex: 89, count: 2 },
      ],
      channels: [
        {
          channel: "serverchan",
          todayTotal: 2,
          todaySuccess: 1,
          todayFailed: 1,
          yesterdayTotal: 1,
          last7Total: 3,
          last7Success: 1,
          last7Failed: 2,
          last90Total: 3,
          last90Success: 1,
          last90Failed: 2,
        },
      ],
      sims: [
        {
          simId: 1,
          last7Total: 3,
          last90Total: 3,
          last7Failed: 2,
          todayFailed: 1,
        },
      ],
    };

    const result = summarizeAdminReminderSnapshot(
      snapshot,
      new Map([[1, "07724215611"]]),
      now
    );

    expect(result.todaySent).toBe(2);
    expect(result.todayFailed).toBe(1);
    expect(result.failedRecent).toBe(2);
    expect(result.yesterdaySent).toBe(1);
    expect(result.last90DaysSends.at(-1)?.count).toBe(2);
    expect(result.todayChannelStats[0]).toMatchObject({
      channel: "serverchan",
      total: 2,
      failed: 1,
    });
    expect(result.channelStatsLast7Days[0].failRate).toBe(67);
    expect(result.topFailingSims[0]).toEqual({
      simId: 1,
      phoneNumber: "07724215611",
      failedCount: 2,
    });
    expect(result.topActiveSims[0].failedCount).toBe(3);
    expect(result.todayFailingSims[0].failedCount).toBe(1);
  });

  it("空快照仍补齐 90 天和四个渠道", () => {
    const result = summarizeAdminReminderSnapshot(
      { daily: [], channels: [], sims: [] },
      new Map(),
      now
    );

    expect(result.last90DaysSends).toHaveLength(90);
    expect(result.channelStatsLast90Days).toHaveLength(4);
    expect(result.todaySent).toBe(0);
    expect(result.topActiveSims).toEqual([]);
  });
});
