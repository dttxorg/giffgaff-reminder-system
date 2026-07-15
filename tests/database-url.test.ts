import { describe, expect, it } from "vitest";
import { resolveRuntimeDatabaseUrl } from "../lib/database-url";

describe("resolveRuntimeDatabaseUrl", () => {
  it("同时存在时优先使用 Prisma pooler 地址", () => {
    expect(
      resolveRuntimeDatabaseUrl({
        DATABASE_URL: "postgresql://direct",
        POSTGRES_PRISMA_URL: "postgresql://pooler",
      })
    ).toBe("postgresql://pooler");
  });

  it("本地只有 DATABASE_URL 时保持兼容", () => {
    expect(
      resolveRuntimeDatabaseUrl({ DATABASE_URL: "postgresql://localhost/db" })
    ).toBe("postgresql://localhost/db");
  });

  it("没有任何数据库地址时给出明确错误", () => {
    expect(() => resolveRuntimeDatabaseUrl({})).toThrow("DATABASE_URL 未设置");
  });
});
