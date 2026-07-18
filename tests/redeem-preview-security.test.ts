import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimits: vi.fn(),
  getClientIp: vi.fn(),
  rateLimitResponse: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("../lib/rate-limit", () => ({
  enforceRateLimits: mocks.enforceRateLimits,
  getClientIp: mocks.getClientIp,
  rateLimitResponse: mocks.rateLimitResponse,
}));

vi.mock("../lib/db", () => ({
  prisma: { cardKey: { findUnique: mocks.findUnique } },
}));

import { GET } from "../app/api/redeem/preview/route";

describe("GET /api/redeem/preview security", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getClientIp.mockReturnValue("203.0.113.9");
    mocks.enforceRateLimits.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it("格式错误时不访问限流存储或数据库", async () => {
    const response = await GET(
      new Request("http://localhost/api/redeem/preview?code=short")
    );

    expect(response.status).toBe(400);
    expect(mocks.enforceRateLimits).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("有效格式同时执行 IP 桶与卡密哈希标识桶", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    const response = await GET(
      new Request(
        "http://localhost/api/redeem/preview?code=7K9P3R4M8H2XN5YQ"
      )
    );

    expect(response.status).toBe(404);
    expect(mocks.enforceRateLimits).toHaveBeenCalledWith([
      {
        scope: "redeem-preview-ip",
        identifiers: ["203.0.113.9"],
        limit: 10,
        windowMs: 60 * 1000,
      },
      {
        scope: "redeem-preview-code",
        identifiers: ["7K9P3R4M8H2XN5YQ"],
        limit: 3,
        windowMs: 15 * 60 * 1000,
      },
    ]);
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { code: "7K9P3R4M8H2XN5YQ" },
    });
  });

  it("限流命中后直接返回保护响应", async () => {
    const limited = { allowed: false, retryAfterSeconds: 60 };
    const protectedResponse = new Response("limited", { status: 429 });
    mocks.enforceRateLimits.mockResolvedValueOnce(limited);
    mocks.rateLimitResponse.mockReturnValueOnce(protectedResponse);

    const response = await GET(
      new Request(
        "http://localhost/api/redeem/preview?code=7K9P3R4M8H2XN5YQ"
      )
    );

    expect(response).toBe(protectedResponse);
    expect(mocks.rateLimitResponse).toHaveBeenCalledWith(limited);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
