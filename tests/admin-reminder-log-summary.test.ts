import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("../lib/db", () => ({
  prisma: { $queryRaw: mocks.queryRaw },
}));

import { getAdminReminderLogSummary } from "../lib/admin-reminder-log-summary";

describe("提醒日志全局概览", () => {
  beforeEach(() => mocks.queryRaw.mockReset());

  it("一次查询返回总数、今日发送和今日失败", async () => {
    mocks.queryRaw.mockResolvedValue([
      { totalCount: 120, totalToday: 8, failedToday: 2 },
    ]);

    await expect(
      getAdminReminderLogSummary(new Date("2026-07-15T00:00:00.000Z"))
    ).resolves.toEqual({ totalCount: 120, totalToday: 8, failedToday: 2 });
    expect(mocks.queryRaw).toHaveBeenCalledOnce();
  });

  it("空结果防御性返回零值", async () => {
    mocks.queryRaw.mockResolvedValue([]);
    await expect(
      getAdminReminderLogSummary(new Date("2026-07-15T00:00:00.000Z"))
    ).resolves.toEqual({ totalCount: 0, totalToday: 0, failedToday: 0 });
  });
});
