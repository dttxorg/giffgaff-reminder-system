import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  prisma: {
    sim: {
      findUnique: dbMocks.findUnique,
      update: dbMocks.update,
    },
  },
}));

import { ensureSimPortToken, findSimByParam } from "../lib/port-token-db";

describe("ensureSimPortToken", () => {
  beforeEach(() => {
    dbMocks.findUnique.mockReset();
    dbMocks.update.mockReset();
  });

  it("调用方已知 token 缺失时跳过重复 findUnique", async () => {
    dbMocks.update.mockResolvedValueOnce({ portToken: "generated-token" });

    await expect(ensureSimPortToken(42, null)).resolves.toBe("generated-token");
    expect(dbMocks.findUnique).not.toHaveBeenCalled();
    expect(dbMocks.update).toHaveBeenCalledOnce();
  });

  it("已有 token 时不访问数据库", async () => {
    await expect(ensureSimPortToken(42, "existing-token")).resolves.toBe(
      "existing-token"
    );
    expect(dbMocks.findUnique).not.toHaveBeenCalled();
    expect(dbMocks.update).not.toHaveBeenCalled();
  });
});

describe("findSimByParam", () => {
  beforeEach(() => dbMocks.findUnique.mockReset());

  it("数字 ID 不访问数据库", async () => {
    await expect(findSimByParam("42")).resolves.toBeNull();
    expect(dbMocks.findUnique).not.toHaveBeenCalled();
  });

  it("只按 32-64 位随机 token 查询", async () => {
    const token = "abc123def456ghi789jkl012mno345pq";
    dbMocks.findUnique.mockResolvedValueOnce({ id: 42, portToken: token });
    await expect(findSimByParam(token)).resolves.toEqual({
      id: 42,
      portToken: token,
    });
    expect(dbMocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { portToken: token } })
    );
  });
});
