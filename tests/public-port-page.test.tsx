import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  getCachedPublicSim: vi.fn(),
}));

vi.mock("../lib/public-sim-cache", () => ({
  getCachedPublicSim: mocks.getCachedPublicSim,
}));

import PortPage from "../app/p/[simId]/page";
import type { SimInfo } from "../app/p/[simId]/port-client";

const sim = {
  id: 42,
  phoneNumber: "07724215611",
  activatedAt: new Date("2026-01-01T00:00:00.000Z"),
  lastPortedAt: null,
  portToken: "abc123def456ghi789jkl012mno345pq",
};

describe("public port server page", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it("token 路径在服务端读取缓存并传入首屏数据", async () => {
    mocks.getCachedPublicSim.mockResolvedValueOnce(sim);

    const element = (await PortPage({
      params: Promise.resolve({ simId: sim.portToken }),
    })) as ReactElement<{ simIdRaw: string; initialSim: SimInfo }>;

    expect(mocks.getCachedPublicSim).toHaveBeenCalledWith(sim.portToken);
    expect(element.props.simIdRaw).toBe(sim.portToken);
    expect(element.props.initialSim).toMatchObject({
      phoneNumber: "****** 5611",
      activatedAt: "2026-01-01",
      dayOffset: expect.any(Number),
    });
  });

  it("数字路径直接返回失效状态，不查询或泄露 token", async () => {
    const element = (await PortPage({
      params: Promise.resolve({ simId: "42" }),
    })) as ReactElement<{ simIdRaw: string; initialSim: SimInfo | null }>;
    expect(element.props.initialSim).toBeNull();
    expect(mocks.getCachedPublicSim).not.toHaveBeenCalled();
  });
});
