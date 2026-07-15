import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("公开保号提交查询预算", () => {
  const route = fs.readFileSync("app/api/p/[simId]/port/route.ts", "utf8");
  const write = fs.readFileSync("lib/public-port-write.ts", "utf8");

  it("路由通过单次写入快照完成定位、日期校验和更新", () => {
    expect(route).toContain("updatePublicSimPortDate(simId, portedAt)");
    expect(route).not.toContain("findSimByParam");
    expect(route).not.toContain("prisma.sim.update");
    expect(write.match(/prisma\.\$queryRaw/g)).toHaveLength(1);
    expect(write).toContain("WITH target AS (");
    expect(write).toContain('UPDATE "Sim" sim');
    expect(write).toContain('target."activatedAt"::date');
  });

  it("更新只返回缓存失效所需的 id 与 token", () => {
    expect(write).toContain('RETURNING sim."id", sim."portToken"');
    expect(write).not.toContain('"phoneNumber"');
    expect(route).toContain("invalidatePublicSimCache(outcome.sim)");
  });
});
