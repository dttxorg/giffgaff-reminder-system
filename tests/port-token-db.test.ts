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

import { ensureSimPortToken } from "../lib/port-token-db";

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
