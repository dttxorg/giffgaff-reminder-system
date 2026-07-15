import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("管理员批量测试推送响应预算", () => {
  const route = fs.readFileSync(
    "app/api/admin/sims/test-push/route.ts",
    "utf8"
  );

  it("不同推送目标使用最多 5 路并发", () => {
    expect(route).toContain("const PUSH_CONCURRENCY = 5");
    expect(route).toContain("mapWithConcurrency(");
    expect(route).toContain("Array.from(groupsByDestination.values())");
  });

  it("同一渠道 Key 先分组再串行，避免接收方限流", () => {
    expect(route).toContain("groupsByDestination");
    expect(route).toContain("`${sim.channel}:${sim.channelKey}`");
    expect(route).toContain("for (const sim of group)");
    expect(route).toContain("await sendTestPush(sim)");
  });

  it("SIM 查询只读取发送所需字段", () => {
    for (const field of ["id", "phoneNumber", "channel", "channelKey"]) {
      expect(route).toContain(`${field}: true`);
    }
    expect(route).not.toContain("activatedAt: true");
    expect(route).not.toContain("portToken: true");
  });
});
