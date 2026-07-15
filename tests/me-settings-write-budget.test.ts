import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("用户设置写接口查询预算", () => {
  const password = fs.readFileSync("app/api/me/password/route.ts", "utf8");
  const sim = fs.readFileSync("app/api/me/sim/route.ts", "utf8");
  const channel = fs.readFileSync("app/api/me/channel/route.ts", "utf8");
  const writes = fs.readFileSync("lib/user-sim-writes.ts", "utf8");

  it("三个接口不把完整 SIM 列表载入 Session", () => {
    for (const source of [password, sim, channel]) {
      expect(source).not.toContain("getCurrentUser()");
    }
    expect(password).toContain("getCurrentUserId()");
    expect(sim).toContain("getCurrentUserSessionId()");
    expect(channel).toContain("getCurrentUserSessionId()");
  });

  it("修改密码只读取密码哈希", () => {
    expect(password).toContain("select: { passwordHash: true }");
  });

  it("指定 SIM 的常用保存路径把 Session、归属校验和写入合并为一次 SQL", () => {
    expect(sim).toContain("updateCurrentUserSimActivatedAt(");
    expect(channel).toContain("updateCurrentUserSimChannel(");
    expect(writes.match(/prisma\.\$queryRaw/g)).toHaveLength(2);
    expect(writes).toContain('FROM "UserSession"');
    expect(writes).toContain('UPDATE "Sim" sim');
    expect(writes).toContain('AS "authenticated"');
    expect(writes).toContain('AS "hasSims"');
    expect(sim).toContain("invalidatePublicSimCache(outcome.sim)");
  });
});
