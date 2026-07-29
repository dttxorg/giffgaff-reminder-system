import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  userCreate: vi.fn(),
  simCreate: vi.fn(),
  hashPassword: vi.fn(),
  generatePortToken: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getAdminSession: mocks.getAdminSession,
}));

vi.mock("../lib/db", () => ({
  prisma: {
    sim: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("../lib/auth", () => ({
  hashPassword: mocks.hashPassword,
}));

vi.mock("../lib/port-token", () => ({
  generatePortToken: mocks.generatePortToken,
}));

import { POST } from "../app/api/admin/sims/route";

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/sims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phoneNumber: "447700900123",
      activatedAt: "2026-07-01",
      status: "active",
      initialPassword: "secure-pass",
      ...body,
    }),
  });
}

describe("POST /api/admin/sims 多运营商提醒规则", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getAdminSession.mockResolvedValue({ id: 1 });
    mocks.findUnique.mockResolvedValue(null);
    mocks.hashPassword.mockResolvedValue("password-hash");
    mocks.generatePortToken.mockReturnValue("port-token");
    mocks.userCreate.mockResolvedValue({ id: 9 });
    mocks.simCreate.mockResolvedValue({ id: 12 });
    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          user: { create: mocks.userCreate },
          sim: { create: mocks.simCreate },
        })
    );
  });

  it("创建 CTExcel 号码时保存运营商预设和客户自定义日期", async () => {
    const response = await POST(
      request({
        carrier: "ctexcel",
        reminderStartDay: 75,
        cycleDays: 92,
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.simCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        carrier: "ctexcel",
        reminderStartDay: 75,
        cycleDays: 92,
        userId: 9,
      }),
    });
  });

  it("更新既有号码的日期时不会把运营商重置为 Giffgaff", async () => {
    mocks.findUnique.mockResolvedValue({ id: 7 });
    mocks.update.mockResolvedValue({ id: 7 });

    const response = await POST(request({}));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        activatedAt: new Date("2026-07-01T00:00:00.000Z"),
        status: "active",
      },
    });
  });
});
