import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock("../lib/db", () => ({
  prisma: { $queryRaw: mocks.queryRaw },
}));

import { enforceRateLimits } from "../lib/rate-limit";

const rule = {
  scope: "login-ip",
  identifiers: ["203.0.113.9"],
  limit: 5,
  windowMs: 60_000,
};

describe("persistent rate limiter", () => {
  beforeEach(() => mocks.queryRaw.mockReset());

  it("共享数据库计数未超过阈值时放行", async () => {
    mocks.queryRaw.mockResolvedValueOnce([
      { count: 5, resetAt: new Date(Date.now() + 60_000) },
    ]);
    await expect(enforceRateLimits([rule])).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("超过阈值时返回剩余等待时间", async () => {
    mocks.queryRaw.mockResolvedValueOnce([
      { count: 6, resetAt: new Date(Date.now() + 60_000) },
    ]);
    const result = await enforceRateLimits([rule]);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("限流存储异常时 fail closed", async () => {
    mocks.queryRaw.mockRejectedValueOnce(new Error("db unavailable"));
    await expect(enforceRateLimits([rule])).resolves.toMatchObject({
      allowed: false,
      unavailable: true,
    });
  });
});
