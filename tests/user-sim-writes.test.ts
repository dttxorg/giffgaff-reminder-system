import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("../lib/db", () => ({
  prisma: { $queryRaw: dbMocks.queryRaw },
}));

import {
  updateCurrentUserSimActivatedAt,
  updateCurrentUserSimChannel,
} from "../lib/user-sim-writes";

describe("current user SIM writes", () => {
  beforeEach(() => dbMocks.queryRaw.mockReset());

  it("激活日期更新在一次查询中返回公开缓存所需字段", async () => {
    dbMocks.queryRaw.mockResolvedValueOnce([
      {
        authenticated: true,
        hasSims: true,
        simId: 23,
        portToken: "public-token",
      },
    ]);

    const result = await updateCurrentUserSimActivatedAt(
      "session-id",
      23,
      new Date("2026-01-02T00:00:00.000Z")
    );

    expect(dbMocks.queryRaw).toHaveBeenCalledOnce();
    expect(result).toEqual({
      authenticated: true,
      hasSims: true,
      sim: { id: 23, portToken: "public-token" },
    });
  });

  it("渠道更新在一次查询中保留越权判断信息", async () => {
    dbMocks.queryRaw.mockResolvedValueOnce([
      {
        authenticated: true,
        hasSims: true,
        simId: null,
        portToken: null,
      },
    ]);

    const result = await updateCurrentUserSimChannel(
      "session-id",
      99,
      "bark",
      "https://api.day.app/example"
    );

    expect(dbMocks.queryRaw).toHaveBeenCalledOnce();
    expect(result).toEqual({
      authenticated: true,
      hasSims: true,
      sim: null,
    });
  });

  it("无快照时按未登录处理", async () => {
    dbMocks.queryRaw.mockResolvedValueOnce([]);

    const result = await updateCurrentUserSimChannel(
      "missing-session",
      23,
      "serverchan",
      "send-key"
    );

    expect(result).toEqual({
      authenticated: false,
      hasSims: false,
      sim: null,
    });
  });
});
