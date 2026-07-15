import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("../lib/db", () => ({
  prisma: { $queryRaw: dbMocks.queryRaw },
}));

import { getPublicStatsSnapshot } from "../lib/public-stats";

describe("public stats snapshot", () => {
  beforeEach(() => dbMocks.queryRaw.mockReset());

  it("一次查询返回号码数与成功提醒数", async () => {
    dbMocks.queryRaw.mockResolvedValueOnce([{ simCount: 42, sentCount: 100 }]);

    await expect(getPublicStatsSnapshot()).resolves.toEqual({
      simCount: 42,
      sentCount: 100,
    });
    expect(dbMocks.queryRaw).toHaveBeenCalledOnce();
  });

  it("空结果防御性返回零值", async () => {
    dbMocks.queryRaw.mockResolvedValueOnce([]);

    await expect(getPublicStatsSnapshot()).resolves.toEqual({
      simCount: 0,
      sentCount: 0,
    });
  });
});
