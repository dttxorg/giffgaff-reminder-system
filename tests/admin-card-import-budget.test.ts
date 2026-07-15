import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("卡密批量导入查询预算", () => {
  const source = fs.readFileSync(
    "app/api/admin/cards/import/route.ts",
    "utf8"
  );

  it("依赖唯一索引的一次 createMany，不再预读已有卡密", () => {
    expect(source).toContain("prisma.cardKey.createMany({");
    expect(source).toContain("skipDuplicates: true");
    expect(source).toContain("imported = result.count");
    expect(source).toContain("normalized.length - imported");
    expect(source).not.toContain("prisma.cardKey.findMany");
    expect(source.match(/prisma\.cardKey\./g)).toHaveLength(1);
  });
});
