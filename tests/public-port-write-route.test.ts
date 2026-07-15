import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updatePublicSimPortDate: vi.fn(),
  invalidatePublicSimCache: vi.fn(),
}));

vi.mock("../lib/public-port-write", () => ({
  updatePublicSimPortDate: mocks.updatePublicSimPortDate,
}));
vi.mock("../lib/public-sim-cache", () => ({
  invalidatePublicSimCache: mocks.invalidatePublicSimCache,
}));

import { POST } from "../app/api/p/[simId]/port/route";

function request(portedAt: string) {
  return new Request("http://localhost/api/p/token/port", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ portedAt }),
  });
}

const context = {
  params: Promise.resolve({ simId: "abc123def456ghi789jkl012mno345pq" }),
};

describe("POST /api/p/[simId]/port", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00.000Z"));
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  afterEach(() => vi.useRealTimers());

  it("成功更新后立即失效 id 与 token 缓存", async () => {
    const sim = {
      id: 42,
      portToken: "abc123def456ghi789jkl012mno345pq",
    };
    mocks.updatePublicSimPortDate.mockResolvedValueOnce({
      found: true,
      sim,
    });

    const response = await POST(request("2026-07-15"), context);

    expect(response.status).toBe(200);
    expect(mocks.updatePublicSimPortDate).toHaveBeenCalledWith(
      sim.portToken,
      new Date("2026-07-15T00:00:00.000Z")
    );
    expect(mocks.invalidatePublicSimCache).toHaveBeenCalledWith(sim);
  });

  it("未找到 SIM 时返回 404", async () => {
    mocks.updatePublicSimPortDate.mockResolvedValueOnce({
      found: false,
      sim: null,
    });

    const response = await POST(request("2026-07-15"), context);

    expect(response.status).toBe(404);
    expect(mocks.invalidatePublicSimCache).not.toHaveBeenCalled();
  });

  it("早于激活日期时返回 400", async () => {
    mocks.updatePublicSimPortDate.mockResolvedValueOnce({
      found: true,
      sim: null,
    });

    const response = await POST(request("2025-01-01"), context);

    expect(response.status).toBe(400);
    expect(mocks.invalidatePublicSimCache).not.toHaveBeenCalled();
  });

  it("未来日期在访问数据库前被拒绝", async () => {
    const response = await POST(request("2026-07-16"), context);

    expect(response.status).toBe(400);
    expect(mocks.updatePublicSimPortDate).not.toHaveBeenCalled();
  });
});
