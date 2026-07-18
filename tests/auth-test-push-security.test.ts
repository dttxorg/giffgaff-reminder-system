import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  enforceRateLimits: vi.fn(),
  sendPush: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getCurrentUserId: mocks.getCurrentUserId,
}));
vi.mock("../lib/rate-limit", () => ({
  enforceRateLimits: mocks.enforceRateLimits,
  getClientIp: () => "203.0.113.9",
  rateLimitResponse: vi.fn(),
}));
vi.mock("../lib/channels", () => ({ sendPush: mocks.sendPush }));

import { POST } from "../app/api/auth/test-push/route";

function request() {
  return new Request("https://baohao.example/api/auth/test-push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "bark",
      channelKey: "https://api.day.app/device-key",
    }),
  });
}

describe("POST /api/auth/test-push security", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.enforceRateLimits.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it("未登录时不触发任何外部请求", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.sendPush).not.toHaveBeenCalled();
    expect(mocks.enforceRateLimits).not.toHaveBeenCalled();
  });

  it("已登录请求经过持久限流后才发送", async () => {
    mocks.getCurrentUserId.mockResolvedValue(7);
    mocks.sendPush.mockResolvedValue({ ok: true });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.enforceRateLimits).toHaveBeenCalledOnce();
    expect(mocks.sendPush).toHaveBeenCalledOnce();
  });

  it("下游错误不向客户端暴露 URL 或底层网络细节", async () => {
    mocks.getCurrentUserId.mockResolvedValue(7);
    mocks.sendPush.mockResolvedValue({
      ok: false,
      errorMessage: "connect ECONNREFUSED 127.0.0.1:80",
    });
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("127.0.0.1");
  });
});
