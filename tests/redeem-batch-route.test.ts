import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  enforceRateLimits: vi.fn(),
  getClientIp: vi.fn(),
  rateLimitResponse: vi.fn(),
  transaction: vi.fn(),
  redeemCard: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getCurrentUserId: mocks.getCurrentUserId,
}));
vi.mock("../lib/rate-limit", () => ({
  enforceRateLimits: mocks.enforceRateLimits,
  getClientIp: mocks.getClientIp,
  rateLimitResponse: mocks.rateLimitResponse,
}));
vi.mock("../lib/db", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("../lib/redeem", () => ({
  redeemCard: mocks.redeemCard,
}));

import { POST } from "../app/api/redeem/batch/route";

const CODE_A = "7K9P3R4M8H2XN5YQ";
const CODE_B = "8W3RK2NP9X5TM7QH";

function request(
  items: Array<{
    code: string;
    phoneNumber: string;
    activatedAt: string;
  }>
) {
  return new Request("http://localhost/api/redeem/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
}

describe("POST /api/redeem/batch", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getCurrentUserId.mockResolvedValue(42);
    mocks.getClientIp.mockReturnValue("203.0.113.9");
    mocks.enforceRateLimits.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    mocks.transaction.mockImplementation(
      async (callback: (tx: object) => unknown) => callback({})
    );
  });

  it("未登录时拒绝批量导入且不消耗限流桶", async () => {
    mocks.getCurrentUserId.mockResolvedValueOnce(null);

    const response = await POST(
      request([
        {
          code: CODE_A,
          phoneNumber: "07724215611",
          activatedAt: "2026-07-01",
        },
      ])
    );

    expect(response.status).toBe(401);
    expect(mocks.enforceRateLimits).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("使用用户与 IP 双桶并按输入顺序返回逐项结果", async () => {
    mocks.redeemCard.mockImplementation(
      async (input: { rawCode: string }) =>
        input.rawCode === CODE_A
          ? { ok: true, userId: 42, simId: 101, isNewUser: false }
          : { ok: false, error: "NOT_FOUND" }
    );

    const response = await POST(
      request([
        {
          code: CODE_A,
          phoneNumber: "07724 215611",
          activatedAt: "2026-07-01",
        },
        {
          code: CODE_B,
          phoneNumber: "07724215612",
          activatedAt: "2026-07-02",
        },
      ])
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.enforceRateLimits).toHaveBeenCalledWith([
      {
        scope: "redeem-batch-user",
        identifiers: ["42"],
        limit: 5,
        windowMs: 15 * 60 * 1000,
      },
      {
        scope: "redeem-batch-ip",
        identifiers: ["203.0.113.9"],
        limit: 10,
        windowMs: 15 * 60 * 1000,
      },
    ]);
    expect(payload).toEqual({
      ok: true,
      total: 2,
      redeemed: 1,
      failed: 1,
      results: [
        { index: 0, ok: true, simId: 101 },
        { index: 1, ok: false, error: "卡密不存在" },
      ],
    });
    expect(mocks.redeemCard).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: "07724215611" }),
      42,
      expect.any(Object)
    );
  });

  it("请求内重复项直接标记失败，不启动第二个事务", async () => {
    mocks.redeemCard.mockResolvedValue({
      ok: true,
      userId: 42,
      simId: 101,
      isNewUser: false,
    });

    const response = await POST(
      request([
        {
          code: CODE_A,
          phoneNumber: "07724215611",
          activatedAt: "2026-07-01",
        },
        {
          code: CODE_A,
          phoneNumber: "07724215612",
          activatedAt: "2026-07-02",
        },
      ])
    );
    const payload = await response.json();

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(payload.results[1]).toEqual({
      index: 1,
      ok: false,
      error: "兑换码在本次导入中重复",
    });
  });

  it("超出 50 条时在进入事务前返回参数错误", async () => {
    const items = Array.from({ length: 51 }, (_, index) => ({
      code: CODE_A,
      phoneNumber: `07724${String(index).padStart(6, "0")}`,
      activatedAt: "2026-07-01",
    }));

    const response = await POST(request(items));

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
