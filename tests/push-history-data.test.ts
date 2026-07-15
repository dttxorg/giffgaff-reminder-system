import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("../lib/db", () => ({
  prisma: { $queryRaw: dbMocks.queryRaw },
}));

import {
  getPushHistorySnapshot,
  normalizePushHistorySnapshot,
} from "../lib/push-history-data";

describe("push history data snapshot", () => {
  beforeEach(() => dbMocks.queryRaw.mockReset());

  it("恢复列表日期并保留紧凑日计数", () => {
    const result = normalizePushHistorySnapshot({
      reminders: [
        {
          id: 1,
          sentAt: "2026-07-15T01:00:00.000Z",
          status: "success",
          dayOffset: 175,
          bucket: 0,
          errorMessage: null,
        },
      ],
      last7DayCounts: [{ dayIndex: 6, count: 1 }],
    });

    expect(result.reminders[0].sentAt).toBeInstanceOf(Date);
    expect(result.last7DayCounts).toEqual([{ dayIndex: 6, count: 1 }]);
  });

  it("筛选列表与周计数固定为一次数据库调用", async () => {
    dbMocks.queryRaw.mockResolvedValueOnce([
      { reminders: [], last7DayCounts: [{ dayIndex: 6, count: 2 }] },
    ]);

    const result = await getPushHistorySnapshot({
      simIds: [2, 7],
      status: "failed",
      sentAtRange: {
        gte: new Date("2026-07-01T00:00:00.000Z"),
        lt: new Date("2026-08-01T00:00:00.000Z"),
      },
      weekStart: new Date("2026-07-08T16:00:00.000Z"),
    });

    expect(dbMocks.queryRaw).toHaveBeenCalledOnce();
    expect(result.last7DayCounts[0].count).toBe(2);
  });

  it("空 SIM 集合不访问数据库", async () => {
    const result = await getPushHistorySnapshot({
      simIds: [],
      sentAtRange: {},
      weekStart: new Date("2026-07-08T16:00:00.000Z"),
    });

    expect(dbMocks.queryRaw).not.toHaveBeenCalled();
    expect(result).toEqual({ reminders: [], last7DayCounts: [] });
  });
});
