import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  createMany: vi.fn(),
}));

vi.mock("../lib/session", () => ({
  getAdminSession: mocks.getAdminSession,
}));
vi.mock("../lib/db", () => ({
  prisma: { cardKey: { createMany: mocks.createMany } },
}));

import { POST } from "../app/api/admin/cards/import/route";

function request(codes: string[], notes?: string) {
  return new Request("http://localhost/api/admin/cards/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codes, notes }),
  });
}

describe("POST /api/admin/cards/import", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getAdminSession.mockResolvedValue(true);
  });

  it("一次批量写入并用实际插入数计算跳过数量", async () => {
    mocks.createMany.mockResolvedValueOnce({ count: 1 });

    const response = await POST(
      request(
        ["AAAA-BBBB-CCCC-DDDD", "EEEE-FFFF-GGGG-HHHH"],
        "七月批次"
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.createMany).toHaveBeenCalledOnce();
    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [
        { code: "AAAABBBBCCCCDDDD", notes: "七月批次" },
        { code: "EEEEFFFFGGGGHHHH", notes: "七月批次" },
      ],
      skipDuplicates: true,
    });
    expect(payload).toMatchObject({ imported: 1, skipped: 1, errors: [] });
  });

  it("输入内重复仍作为格式错误，不进入数据库载荷", async () => {
    mocks.createMany.mockResolvedValueOnce({ count: 1 });

    const response = await POST(
      request(["AAAA-BBBB-CCCC-DDDD", "aaaabbbbccccdddd"])
    );
    const payload = await response.json();

    expect(mocks.createMany).toHaveBeenCalledWith({
      data: [{ code: "AAAABBBBCCCCDDDD", notes: null }],
      skipDuplicates: true,
    });
    expect(payload).toMatchObject({ imported: 1, skipped: 0 });
    expect(payload.errors).toHaveLength(1);
    expect(payload.errors[0].reason).toBe("输入内重复");
  });

  it("全部格式无效时不访问数据库", async () => {
    const response = await POST(request(["short"]));
    const payload = await response.json();

    expect(mocks.createMany).not.toHaveBeenCalled();
    expect(payload).toMatchObject({ imported: 0, skipped: 0 });
  });
});
