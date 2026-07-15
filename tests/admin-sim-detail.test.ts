import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  prisma: { $queryRaw: dbMocks.queryRaw },
}));

import { getAdminSimDetail } from "../lib/admin-sim-detail";

describe("getAdminSimDetail", () => {
  beforeEach(() => {
    dbMocks.queryRaw.mockReset();
  });

  it("一次快照读取最小详情并序列化日期给客户端", async () => {
    dbMocks.queryRaw.mockResolvedValueOnce([{
      id: 7,
      phoneNumber: "07724215611",
      activatedAt: new Date("2026-01-02T00:00:00.000Z"),
      lastPortedAt: null,
      status: "active",
      user: { id: 3, username: "owner" },
      recentReminders: [
      {
        id: 9,
        dayOffset: 170,
        bucket: 0,
        sentAt: "2026-07-15T01:02:03.000Z",
        status: "success",
        errorMessage: null,
      },
      ],
    }]);

    await expect(getAdminSimDetail(7)).resolves.toEqual({
      id: 7,
      phoneNumber: "07724215611",
      activatedAt: "2026-01-02",
      lastPortedAt: null,
      status: "active",
      user: { id: 3, username: "owner" },
      recentReminders: [
        {
          id: 9,
          dayOffset: 170,
          bucket: 0,
          sentAt: "2026-07-15 01:02:03",
          status: "success",
          errorMessage: null,
        },
      ],
    });
    expect(dbMocks.queryRaw).toHaveBeenCalledOnce();
  });

  it("SIM 不存在时返回 null", async () => {
    dbMocks.queryRaw.mockResolvedValue([]);

    await expect(getAdminSimDetail(404)).resolves.toBeNull();
  });
});
