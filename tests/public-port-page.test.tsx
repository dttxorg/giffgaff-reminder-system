import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  findSimByParam: vi.fn(),
  ensureSimPortToken: vi.fn(),
  getCachedPublicSim: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("../lib/port-token-db", () => ({
  findSimByParam: mocks.findSimByParam,
  ensureSimPortToken: mocks.ensureSimPortToken,
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
    mocks.redirect.mockImplementation((href: string) => {
      throw new Error(`redirect:${href}`);
    });
  });

  it("token 路径在服务端读取缓存并传入首屏数据", async () => {
    mocks.getCachedPublicSim.mockResolvedValueOnce(sim);

    const element = (await PortPage({
      params: Promise.resolve({ simId: sim.portToken }),
    })) as ReactElement<{ simIdRaw: string; initialSim: SimInfo }>;

    expect(mocks.getCachedPublicSim).toHaveBeenCalledWith(sim.portToken);
    expect(element.props.simIdRaw).toBe(sim.portToken);
    expect(element.props.initialSim).toMatchObject({
      phoneNumber: sim.phoneNumber,
      activatedAt: "2026-01-01",
      dayOffset: expect.any(Number),
    });
  });

  it("旧数字路径在服务端直接重定向到已有 token", async () => {
    mocks.findSimByParam.mockResolvedValueOnce(sim);

    await expect(
      PortPage({ params: Promise.resolve({ simId: "42" }) })
    ).rejects.toThrow(`redirect:/p/${sim.portToken}`);

    expect(mocks.getCachedPublicSim).not.toHaveBeenCalled();
    expect(mocks.ensureSimPortToken).not.toHaveBeenCalled();
  });

  it("旧数据缺少 token 时先回填再重定向", async () => {
    mocks.findSimByParam.mockResolvedValueOnce({ ...sim, portToken: null });
    mocks.ensureSimPortToken.mockResolvedValueOnce("generated-token-123456");

    await expect(
      PortPage({ params: Promise.resolve({ simId: "42" }) })
    ).rejects.toThrow("redirect:/p/generated-token-123456");

    expect(mocks.ensureSimPortToken).toHaveBeenCalledWith(42, null);
  });
});
