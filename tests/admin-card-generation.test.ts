import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  findMany: vi.fn(),
  createManyAndReturn: vi.fn(),
  generateCardCode: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getAdminSession: mocks.getAdminSession,
}));

vi.mock("../lib/db", () => ({
  prisma: {
    cardKey: {
      findMany: mocks.findMany,
      createManyAndReturn: mocks.createManyAndReturn,
    },
  },
}));

vi.mock("../lib/card-key", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/card-key")>();
  return { ...actual, generateCardCode: mocks.generateCardCode };
});

import { POST } from "../app/api/admin/cards/route";

describe("POST /api/admin/cards", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getAdminSession.mockResolvedValue({ id: "admin-session" });
    const suffixes = ["EFGH", "EFGJ", "EFGK", "EFGM", "EFGN", "EFGP"];
    let sequence = 0;
    mocks.generateCardCode.mockImplementation(() => {
      const suffix = suffixes[sequence % suffixes.length];
      sequence += 1;
      return `2345-6789-ABCD-${suffix}`;
    });
    mocks.findMany.mockResolvedValue([]);
  });

  it("一次批量写入并返回实际创建的卡密", async () => {
    mocks.createManyAndReturn.mockImplementation(async ({ data }) => data);

    const response = await POST(
      new Request("http://localhost/api/admin/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 3, notes: "批次 A" }),
      })
    );
    const payload = await response.json();

    expect(mocks.findMany).toHaveBeenCalledOnce();
    expect(mocks.createManyAndReturn).toHaveBeenCalledOnce();
    expect(mocks.createManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        select: { code: true },
      })
    );
    expect(payload).toMatchObject({
      ok: true,
      requestedCount: 3,
      createdCount: 3,
    });
    expect(payload.cards).toHaveLength(3);
  });
});
