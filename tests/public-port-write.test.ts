import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("../lib/db", () => ({
  prisma: { $queryRaw: dbMocks.queryRaw },
}));

import { updatePublicSimPortDate } from "../lib/public-port-write";

describe("public port write", () => {
  beforeEach(() => dbMocks.queryRaw.mockReset());

  it("token 定位与更新固定为一次数据库调用", async () => {
    dbMocks.queryRaw.mockResolvedValueOnce([
      {
        found: true,
        simId: 42,
        portToken: "abc123def456ghi789jkl012mno345pq",
      },
    ]);

    const result = await updatePublicSimPortDate(
      "abc123def456ghi789jkl012mno345pq",
      new Date("2026-07-15T00:00:00.000Z")
    );

    expect(dbMocks.queryRaw).toHaveBeenCalledOnce();
    expect(result).toEqual({
      found: true,
      sim: {
        id: 42,
        portToken: "abc123def456ghi789jkl012mno345pq",
      },
    });
  });

  it("找到 SIM 但未更新时保留日期下限错误信息", async () => {
    dbMocks.queryRaw.mockResolvedValueOnce([
      { found: true, simId: null, portToken: null },
    ]);

    await expect(
      updatePublicSimPortDate("42", new Date("2025-01-01T00:00:00.000Z"))
    ).resolves.toEqual({ found: true, sim: null });
    expect(dbMocks.queryRaw).toHaveBeenCalledOnce();
  });

  it("无效公开参数不访问数据库", async () => {
    await expect(
      updatePublicSimPortDate("invalid", new Date("2026-07-15T00:00:00.000Z"))
    ).resolves.toEqual({ found: false, sim: null });
    expect(dbMocks.queryRaw).not.toHaveBeenCalled();
  });
});
