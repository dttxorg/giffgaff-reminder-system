import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  findMany: vi.fn(),
  sendPush: vi.fn(),
  enforceRateLimits: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getAdminSession: mocks.getAdminSession,
}));
vi.mock("../lib/db", () => ({
  prisma: { sim: { findMany: mocks.findMany } },
}));
vi.mock("../lib/channels", () => ({ sendPush: mocks.sendPush }));
vi.mock("../lib/rate-limit", () => ({
  enforceRateLimits: mocks.enforceRateLimits,
  getClientIp: () => "203.0.113.9",
  rateLimitResponse: vi.fn(),
}));

import { POST } from "../app/api/admin/sims/test-push/route";

function request(simIds: number[]) {
  return new Request("http://localhost/api/admin/sims/test-push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ simIds }),
  });
}

describe("POST /api/admin/sims/test-push", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getAdminSession.mockResolvedValue(true);
    mocks.sendPush.mockResolvedValue({ ok: true });
    mocks.enforceRateLimits.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it("保留查询顺序并隔离未配置与渠道失败结果", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 1,
        phoneNumber: "07724215611",
        channel: "serverchan",
        channelKey: "shared-key",
      },
      {
        id: 2,
        phoneNumber: "07724215612",
        channel: "bark",
        channelKey: "",
      },
      {
        id: 3,
        phoneNumber: "07724215613",
        channel: "telegram",
        channelKey: "token|123",
      },
    ]);
    mocks.sendPush
      .mockResolvedValueOnce({ ok: false, errorMessage: "send failed" })
      .mockResolvedValueOnce({ ok: true });

    const response = await POST(request([1, 2, 3]));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.summary).toEqual({ total: 3, success: 1, failed: 2 });
    expect(payload.results.map((result: { simId: number }) => result.simId)).toEqual([
      1, 2, 3,
    ]);
    expect(payload.results[0].error).toBe("send failed");
    expect(payload.results[1].error).toBe("未配置推送渠道");
    expect(mocks.sendPush).toHaveBeenCalledTimes(2);
  });

  it("数据库只读取发送所需字段", async () => {
    mocks.findMany.mockResolvedValue([]);

    await POST(request([1]));

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { id: { in: [1] } },
      select: {
        id: true,
        phoneNumber: true,
        channel: true,
        channelKey: true,
      },
    });
  });

  it("不同目标并发启动，同一目标等待前一条完成", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 1,
        phoneNumber: "07724215611",
        channel: "serverchan",
        channelKey: "shared-key",
      },
      {
        id: 2,
        phoneNumber: "07724215612",
        channel: "serverchan",
        channelKey: "shared-key",
      },
      {
        id: 3,
        phoneNumber: "07724215613",
        channel: "bark",
        channelKey: "other-key",
      },
    ]);
    const pending: Array<{
      key: string;
      resolve: (result: { ok: boolean }) => void;
    }> = [];
    mocks.sendPush.mockImplementation(
      (_channel: string, key: string) =>
        new Promise((resolve) => pending.push({ key, resolve }))
    );

    const responsePromise = POST(request([1, 2, 3]));

    await vi.waitFor(() => expect(mocks.sendPush).toHaveBeenCalledTimes(2));
    expect(pending.map((item) => item.key).sort()).toEqual([
      "other-key",
      "shared-key",
    ]);
    pending.forEach((item) => item.resolve({ ok: true }));

    await vi.waitFor(() => expect(mocks.sendPush).toHaveBeenCalledTimes(3));
    expect(pending.filter((item) => item.key === "shared-key")).toHaveLength(2);
    pending[2].resolve({ ok: true });

    const response = await responsePromise;
    expect(response.status).toBe(200);
  });
});
