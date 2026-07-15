import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("用户设置写接口查询预算", () => {
  const password = fs.readFileSync("app/api/me/password/route.ts", "utf8");
  const sim = fs.readFileSync("app/api/me/sim/route.ts", "utf8");
  const channel = fs.readFileSync("app/api/me/channel/route.ts", "utf8");

  it("三个接口只读取 userId，不把完整 SIM 列表载入 Session", () => {
    for (const source of [password, sim, channel]) {
      expect(source).toContain("getCurrentUserId()");
      expect(source).not.toContain("getCurrentUser()");
    }
  });

  it("修改密码只读取密码哈希", () => {
    expect(password).toContain("select: { passwordHash: true }");
  });

  it("指定 SIM 的写入同时校验 userId，并只返回后续需要的字段", () => {
    expect(sim).toContain("prisma.sim.updateManyAndReturn");
    expect(sim).toContain("where: { id: parsed.data.simId, userId }");
    expect(sim).toContain("select: { id: true, portToken: true }");
    expect(sim).toContain("invalidatePublicSimCache(targetSim)");

    expect(channel).toContain("prisma.sim.updateManyAndReturn");
    expect(channel).toContain("where: { id: requestedSimId, userId }");
    expect(channel).toContain("select: { id: true }");
  });
});
