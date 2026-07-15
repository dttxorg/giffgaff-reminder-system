import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  simFindUnique: vi.fn(),
  simUpdate: vi.fn(),
  simDelete: vi.fn(),
  getAdminSimDetail: vi.fn(),
  invalidatePublicSimCache: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getAdminSession: mocks.getAdminSession,
}));
vi.mock("../lib/db", () => ({
  prisma: {
    sim: {
      findUnique: mocks.simFindUnique,
      update: mocks.simUpdate,
      delete: mocks.simDelete,
    },
  },
}));
vi.mock("../lib/admin-sim-detail", () => ({
  getAdminSimDetail: mocks.getAdminSimDetail,
}));
vi.mock("../lib/public-sim-cache", () => ({
  invalidatePublicSimCache: mocks.invalidatePublicSimCache,
}));

import { PATCH } from "../app/api/admin/sims/[id]/route";

function request(body: unknown) {
  return new Request("http://localhost/api/admin/sims/7", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/admin/sims/[id]", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getAdminSession.mockResolvedValue(true);
    mocks.simFindUnique.mockResolvedValue({
      id: 7,
      activatedAt: new Date("2026-01-01T00:00:00.000Z"),
      lastPortedAt: new Date("2026-02-01T00:00:00.000Z"),
    });
  });

  it("拒绝带数字前缀的动态路由 ID", async () => {
    const response = await PATCH(request({ status: "paused" }), context("7abc"));

    expect(response.status).toBe(400);
    expect(mocks.simFindUnique).not.toHaveBeenCalled();
    expect(mocks.simUpdate).not.toHaveBeenCalled();
  });

  it("拒绝无效日历日期", async () => {
    const response = await PATCH(
      request({ activatedAt: "2026-02-30" }),
      context("7")
    );

    expect(response.status).toBe(400);
    expect(mocks.simUpdate).not.toHaveBeenCalled();
  });

  it("只修改激活日期时也不能越过现有保号日期", async () => {
    const response = await PATCH(
      request({ activatedAt: "2026-03-01" }),
      context("7")
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("上次保号日期不能早于激活日期");
    expect(mocks.simUpdate).not.toHaveBeenCalled();
  });
});
