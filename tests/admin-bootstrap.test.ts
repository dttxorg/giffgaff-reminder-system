import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  prisma: {
    adminUser: {
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
    },
  },
}));

vi.mock("../lib/auth", () => ({ hashPassword: mocks.hashPassword }));

import { ensureDefaultAdmin } from "../lib/admin-bootstrap";

describe("ensureDefaultAdmin", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.upsert.mockReset();
    mocks.hashPassword.mockReset();
  });

  it("已有管理员时直接返回同一查询结果", async () => {
    const admin = { id: 1, username: "admin", passwordHash: "hash" };
    mocks.findUnique.mockResolvedValueOnce(admin);

    await expect(ensureDefaultAdmin()).resolves.toBe(admin);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });

  it("首次创建使用 upsert 避免并发唯一键冲突", async () => {
    const admin = { id: 1, username: "admin", passwordHash: "hash" };
    mocks.findUnique.mockResolvedValueOnce(null);
    mocks.hashPassword.mockResolvedValueOnce("hash");
    mocks.upsert.mockResolvedValueOnce(admin);

    await expect(ensureDefaultAdmin()).resolves.toBe(admin);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { username: "admin" }, update: {} })
    );
  });
});
