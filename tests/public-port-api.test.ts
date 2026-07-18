import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCachedPublicSim: vi.fn(),
}));

vi.mock("../lib/public-sim-cache", () => ({
  getCachedPublicSim: mocks.getCachedPublicSim,
}));

import { GET } from "../app/api/p/[simId]/route";

describe("GET /api/p/[simId]", () => {
  beforeEach(() => {
    mocks.getCachedPublicSim.mockReset();
  });

  it("数字 ID 永远返回 404 且不查询数据库", async () => {
    const response = await GET(new Request("http://localhost/api/p/42"), {
      params: Promise.resolve({ simId: "42" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ ok: false, error: "sim 不存在" });
    expect(mocks.getCachedPublicSim).not.toHaveBeenCalled();
  });

  it("安全 token URL 使用缓存查询", async () => {
    mocks.getCachedPublicSim.mockResolvedValueOnce({
      id: 42,
      phoneNumber: "07724215611",
      activatedAt: new Date("2026-01-01T00:00:00.000Z"),
      lastPortedAt: null,
      portToken: "abc123def456ghi789jkl012mno345pq",
    });

    const response = await GET(
      new Request("http://localhost/api/p/token"),
      {
        params: Promise.resolve({
          simId: "abc123def456ghi789jkl012mno345pq",
        }),
      }
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.phoneNumber).toBe("****** 5611");
    expect(payload).not.toHaveProperty("portToken");
    expect(mocks.getCachedPublicSim).toHaveBeenCalledWith(
      "abc123def456ghi789jkl012mno345pq"
    );
  });
});
