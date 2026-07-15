import { describe, expect, it } from "vitest";
import { summarizeAdminSimSnapshot } from "../lib/admin-dashboard-sim-snapshot";

const now = new Date("2026-07-15T04:00:00.000Z");

describe("admin dashboard sim snapshot", () => {
  it("还原状态、窗口期、新增和绑定率指标", () => {
    const result = summarizeAdminSimSnapshot(
      {
        totalCount: 4,
        activeCount: 3,
        pausedCount: 1,
        channelCount: 2,
        boundCount: 3,
        unboundCount: 1,
        recentCount: 2,
        recentActiveCount: 1,
        recentPausedCount: 1,
        inWindowCount: 1,
        newDailyCounts: [1, 0, 0, 0, 0, 0, 1],
        bindTotalCounts: [2, 2, 3, 3, 3, 4, 4],
        bindBoundCounts: [1, 1, 2, 2, 2, 3, 3],
        inWindowSims: [
          {
            simId: 7,
            phoneNumber: "07724215611",
            dayOffset: 178,
            daysLeft: 2,
          },
        ],
      },
      now
    );

    expect(result.simCount).toBe(4);
    expect(result.channelCount).toBe(2);
    expect(result.simStatusBreakdown).toEqual({
      total: 4,
      active: 3,
      paused: 1,
      bound: 3,
      unbound: 1,
    });
    expect(result.newSimsLast7Days.total).toBe(2);
    expect(result.inWindowSims[0].daysLeft).toBe(2);
    expect(result.bindRateLast7Days[0].bindRate).toBe(50);
    expect(result.userBindRateLast7Days.at(-1)?.unboundSimCount).toBe(1);
    expect(result.pausedSimStats.recentlyPaused).toBe(1);
    expect(result.activeSimStats.recentlyActivated).toBe(1);
  });

  it("缺失数组计数时按零补齐", () => {
    const result = summarizeAdminSimSnapshot(
      {
        totalCount: 0,
        activeCount: 0,
        pausedCount: 0,
        channelCount: 0,
        boundCount: 0,
        unboundCount: 0,
        recentCount: 0,
        recentActiveCount: 0,
        recentPausedCount: 0,
        inWindowCount: 0,
        newDailyCounts: [],
        bindTotalCounts: [],
        bindBoundCounts: [],
        inWindowSims: [],
      },
      now
    );

    expect(result.newSimsLast7Days.daily).toHaveLength(7);
    expect(result.bindRateLast7Days.every((day) => day.bindRate === 0)).toBe(true);
  });
});
