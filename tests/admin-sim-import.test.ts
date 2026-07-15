import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  findMany: vi.fn(),
  createMany: vi.fn(),
  update: vi.fn(),
  generatePortToken: vi.fn(),
  invalidatePublicSimCache: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getAdminSession: mocks.getAdminSession,
}));

vi.mock("../lib/db", () => ({
  prisma: {
    sim: {
      findMany: mocks.findMany,
      createMany: mocks.createMany,
      update: mocks.update,
    },
  },
}));

vi.mock("../lib/port-token", () => ({
  generatePortToken: mocks.generatePortToken,
}));

vi.mock("../lib/public-sim-cache", () => ({
  invalidatePublicSimCache: mocks.invalidatePublicSimCache,
}));

import { POST } from "../app/api/admin/sims/import/route";

describe("POST /api/admin/sims/import", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getAdminSession.mockResolvedValue({ id: "admin-session" });
    mocks.generatePortToken.mockReturnValue("generated-port-token");
    mocks.createMany.mockResolvedValue({ count: 1 });
    mocks.update.mockResolvedValue({ id: 7 });
  });

  it("一次读取全部号码，批量创建新号码，并按唯一号码更新", async () => {
    mocks.findMany.mockResolvedValue([
      { id: 7, phoneNumber: "07724215611", portToken: "existing-token" },
    ]);
    const csv = [
      "phone_number,activated_at",
      "07724215611,2026-01-15",
      "07724215611,2026-01-16",
      "07724215612,2026-02-01",
      "07724215612,2026-02-02",
      "07724215613,2026-02-31",
    ].join("\n");

    const response = await POST(
      new Request("http://localhost/api/admin/sims/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      })
    );
    const payload = await response.json();

    expect(mocks.findMany).toHaveBeenCalledOnce();
    expect(mocks.createMany).toHaveBeenCalledOnce();
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          phoneNumber: "07724215612",
          activatedAt: new Date("2026-02-02T00:00:00.000Z"),
        }),
      ],
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: { activatedAt: new Date("2026-01-16T00:00:00.000Z") },
      })
    );
    expect(payload).toMatchObject({ ok: true, inserted: 1, updated: 3 });
    expect(payload.errors).toEqual(["第 6 行: 日期无效 (2026-02-31)"]);
    expect(mocks.invalidatePublicSimCache).toHaveBeenCalledWith({
      id: 7,
      phoneNumber: "07724215611",
      portToken: "existing-token",
    });
  });

  it("单个已有号码更新失败时保留对应行号，不影响其他计划", async () => {
    mocks.findMany.mockResolvedValue([
      { id: 7, phoneNumber: "07724215611", portToken: null },
    ]);
    mocks.update.mockRejectedValue(new Error("write failed"));

    const response = await POST(
      new Request("http://localhost/api/admin/sims/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: "07724215611,2026-01-15" }),
      })
    );
    const payload = await response.json();

    expect(payload).toMatchObject({ ok: true, inserted: 0, updated: 0 });
    expect(payload.errors).toEqual([
      "第 1 行: 数据库错误 (write failed)",
    ]);
  });
});
