import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  simFindUnique: vi.fn(),
  reminderFindMany: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  prisma: {
    sim: { findUnique: dbMocks.simFindUnique },
    reminderSent: { findMany: dbMocks.reminderFindMany },
  },
}));

import { getAdminSimDetail } from "../lib/admin-sim-detail";

describe("getAdminSimDetail", () => {
  beforeEach(() => {
    dbMocks.simFindUnique.mockReset();
    dbMocks.reminderFindMany.mockReset();
  });

  it("并行读取最小详情并序列化日期给客户端", async () => {
    dbMocks.simFindUnique.mockResolvedValue({
      id: 7,
      phoneNumber: "07724215611",
      activatedAt: new Date("2026-01-02T00:00:00.000Z"),
      lastPortedAt: null,
      status: "active",
      user: { id: 3, username: "owner" },
    });
    dbMocks.reminderFindMany.mockResolvedValue([
      {
        id: 9,
        dayOffset: 170,
        bucket: 0,
        sentAt: new Date("2026-07-15T01:02:03.000Z"),
        status: "success",
        errorMessage: null,
      },
    ]);

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
    expect(dbMocks.simFindUnique).toHaveBeenCalledOnce();
    expect(dbMocks.reminderFindMany).toHaveBeenCalledOnce();
  });

  it("SIM 不存在时返回 null", async () => {
    dbMocks.simFindUnique.mockResolvedValue(null);
    dbMocks.reminderFindMany.mockResolvedValue([]);

    await expect(getAdminSimDetail(404)).resolves.toBeNull();
  });
});
