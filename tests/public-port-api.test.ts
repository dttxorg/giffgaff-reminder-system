import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findSimByParam: vi.fn(),
  ensureSimPortToken: vi.fn(),
  getCachedPublicSim: vi.fn(),
  invalidatePublicSimCache: vi.fn(),
}));

vi.mock("../lib/port-token-db", () => ({
  findSimByParam: mocks.findSimByParam,
  ensureSimPortToken: mocks.ensureSimPortToken,
}));

vi.mock("../lib/public-sim-cache", () => ({
  getCachedPublicSim: mocks.getCachedPublicSim,
  invalidatePublicSimCache: mocks.invalidatePublicSimCache,
}));

import { GET } from "../app/api/p/[simId]/route";

describe("GET /api/p/[simId]", () => {
  beforeEach(() => {
    mocks.findSimByParam.mockReset();
    mocks.ensureSimPortToken.mockReset();
    mocks.getCachedPublicSim.mockReset();
    mocks.invalidatePublicSimCache.mockReset();
  });

  it("旧数字 URL 首次访问即返回刚回填的安全 token", async () => {
    mocks.findSimByParam.mockResolvedValueOnce({
      id: 42,
      phoneNumber: "07724215611",
      activatedAt: new Date("2026-01-01T00:00:00.000Z"),
      lastPortedAt: null,
      portToken: null,
    });
    mocks.ensureSimPortToken.mockResolvedValueOnce("generated-token-123456");

    const response = await GET(new Request("http://localhost/api/p/42"), {
      params: Promise.resolve({ simId: "42" }),
    });
    const payload = await response.json();

    expect(payload.portToken).toBe("generated-token-123456");
    expect(mocks.ensureSimPortToken).toHaveBeenCalledWith(42, null);
    expect(mocks.invalidatePublicSimCache).toHaveBeenCalledWith({
      id: 42,
      portToken: "generated-token-123456",
    });
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
    expect(mocks.getCachedPublicSim).toHaveBeenCalledWith(
      "abc123def456ghi789jkl012mno345pq"
    );
    expect(mocks.findSimByParam).not.toHaveBeenCalled();
  });
});
