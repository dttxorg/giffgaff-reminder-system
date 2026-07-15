import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("首页公开统计查询预算", () => {
  const component = fs.readFileSync(
    "app/_components/public-stats.tsx",
    "utf8"
  );
  const snapshot = fs.readFileSync("lib/public-stats.ts", "utf8");

  it("缓存层只调用一个单行统计快照", () => {
    expect(component).toContain("getPublicStatsSnapshot");
    expect(component).not.toContain("prisma.");
    expect(snapshot.match(/prisma\.\$queryRaw/g)).toHaveLength(1);
    expect(snapshot).toContain('AS "simCount"');
    expect(snapshot).toContain('AS "sentCount"');
  });

  it("不再为两个计数占用两次数据库调用", () => {
    expect(snapshot).not.toContain("prisma.sim.count");
    expect(snapshot).not.toContain("prisma.reminderSent.count");
    expect(snapshot).not.toContain("Promise.all");
  });
});
