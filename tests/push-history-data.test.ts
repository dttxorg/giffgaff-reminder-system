import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("../lib/db", () => ({
  prisma: { $queryRaw: dbMocks.queryRaw },
}));

import {
  getPushHistoryPageData,
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

  it("Session、SIM 摘要、筛选列表与周计数固定为一次数据库调用", async () => {
    dbMocks.queryRaw.mockResolvedValueOnce([
      {
        expiresAt: new Date("2099-07-22T00:00:00.000Z"),
        sims: [
          {
            id: 2,
            activatedAt: "2026-01-01T00:00:00.000Z",
            lastPortedAt: null,
          },
        ],
        reminders: [],
        last7DayCounts: [{ dayIndex: 6, count: 2 }],
      },
    ]);

    const result = await getPushHistoryPageData({
      sessionId: "session-1",
      requestedSimId: 2,
      status: "failed",
      sentAtRange: {
        gte: new Date("2026-07-01T00:00:00.000Z"),
        lt: new Date("2026-08-01T00:00:00.000Z"),
      },
      weekStart: new Date("2026-07-08T16:00:00.000Z"),
    });

    expect(dbMocks.queryRaw).toHaveBeenCalledOnce();
    expect(result?.last7DayCounts[0].count).toBe(2);
    expect(result?.sims[0].activatedAt).toBeInstanceOf(Date);
  });

  it("无效 Session 返回 null", async () => {
    dbMocks.queryRaw.mockResolvedValueOnce([
      {
        expiresAt: null,
        sims: [],
        reminders: [],
        last7DayCounts: [],
      },
    ]);

    const result = await getPushHistoryPageData({
      sessionId: "missing-session",
      requestedSimId: null,
      sentAtRange: {},
      weekStart: new Date("2026-07-08T16:00:00.000Z"),
    });

    expect(dbMocks.queryRaw).toHaveBeenCalledOnce();
    expect(result).toBeNull();
  });
});
