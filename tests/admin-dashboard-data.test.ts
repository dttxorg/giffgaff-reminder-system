import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  simFindMany: vi.fn(),
  userFindMany: vi.fn(),
  reminderFindMany: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  prisma: {
    sim: { findMany: dbMocks.simFindMany },
    user: { findMany: dbMocks.userFindMany },
    reminderSent: { findMany: dbMocks.reminderFindMany },
    $queryRaw: dbMocks.queryRaw,
  },
}));

import {
  getAdminDashboardData,
  summarizeAdminDashboard,
  type AdminDashboardReminder,
  type AdminDashboardSim,
} from "../lib/admin-dashboard-data";

const now = new Date("2026-07-15T04:00:00.000Z");

function sim(id: number, overrides: Partial<AdminDashboardSim> = {}): AdminDashboardSim {
  return {
    id,
    phoneNumber: `0772400000${id}`,
    activatedAt: new Date("2026-01-20T04:00:00.000Z"),
    lastPortedAt: null,
    status: "active",
    channelKey: "key",
    userId: id,
    createdAt: new Date("2026-07-10T04:00:00.000Z"),
    user: { createdAt: new Date("2026-07-10T04:00:00.000Z") },
    ...overrides,
  };
}

function reminder(
  simId: number,
  sentAt: string,
  status: "success" | "failed" = "success"
): AdminDashboardReminder {
  return { simId, sentAt: new Date(sentAt), status, channel: "serverchan" };
}

describe("admin-dashboard-data", () => {
  beforeEach(() => {
    dbMocks.simFindMany.mockReset();
    dbMocks.userFindMany.mockReset();
    dbMocks.reminderFindMany.mockReset();
    dbMocks.queryRaw.mockReset();
  });

  it("一次内存汇总生成核心、排行、渠道、窗口和趋势数据", () => {
    const result = summarizeAdminDashboard(
      [
        reminder(1, "2026-07-15T01:00:00.000Z"),
        reminder(1, "2026-07-15T02:00:00.000Z", "failed"),
        reminder(2, "2026-07-14T01:00:00.000Z", "failed"),
      ],
      [
        sim(1, { activatedAt: new Date("2026-01-21T04:00:00.000Z") }),
        sim(2, { status: "paused", channelKey: "", userId: null, user: null }),
      ],
      [{ createdAt: new Date("2026-07-10T04:00:00.000Z") }],
      now
    );

    expect(result.simCount).toBe(2);
    expect(result.activeSimCount).toBe(1);
    expect(result.todaySent).toBe(2);
    expect(result.todayFailed).toBe(1);
    expect(result.failedRecent).toBe(2);
    expect(result.topFailingSims[0]).toMatchObject({ simId: 1, failedCount: 1 });
    expect(result.channelStatsLast7Days[0]).toMatchObject({ total: 3, failed: 2 });
    expect(result.last90DaysSends.at(-1)?.count).toBe(2);
    expect(result.newSimsLast7Days.total).toBe(2);
    expect(result.inWindowSimCount).toBe(1);
  });

  it("鉴权后一轮并行查询,90 日日志改为聚合快照", async () => {
    dbMocks.simFindMany.mockResolvedValueOnce([]);
    dbMocks.userFindMany.mockResolvedValueOnce([]);
    dbMocks.queryRaw.mockResolvedValueOnce([
      { daily: [], channels: [], sims: [] },
    ]);
    dbMocks.reminderFindMany.mockResolvedValueOnce([]);

    await getAdminDashboardData(now);

    expect(dbMocks.simFindMany).toHaveBeenCalledOnce();
    expect(dbMocks.userFindMany).toHaveBeenCalledOnce();
    expect(dbMocks.reminderFindMany).toHaveBeenCalledOnce();
    expect(dbMocks.queryRaw).toHaveBeenCalledOnce();
  });
});
