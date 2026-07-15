import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("推送历史查询载荷预算", () => {
  const page = fs.readFileSync("app/me/pushes/page.tsx", "utf8");
  const data = fs.readFileSync("lib/push-history-data.ts", "utf8");
  const session = fs.readFileSync("lib/session.ts", "utf8");
  const helperStart = session.indexOf(
    "export const getCurrentUserPushHistoryContext"
  );
  const helperEnd = session.indexOf(
    "interface CurrentUserSettingsRow"
  );
  const helper = session.slice(helperStart, helperEnd);

  it("页面使用最小 Session 上下文而不是完整 SIM 详情", () => {
    expect(page).toContain("getCurrentUserPushHistoryContext()");
    expect(page).not.toContain("getCurrentUser()");
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperEnd).toBeGreaterThan(helperStart);
    expect(helper).toContain("activatedAt: true");
    expect(helper).toContain("lastPortedAt: true");
    expect(helper).not.toContain("phoneNumber");
    expect(helper).not.toContain("portToken");
    expect(helper).not.toContain("channelKey");
    expect(helper).not.toContain("username");
  });

  it("历史列表与周图表合并为一次有界快照查询", () => {
    expect(page).toContain("getPushHistorySnapshot({");
    expect(page).not.toContain("prisma.");
    expect(data.match(/prisma\.\$queryRaw/g)).toHaveLength(1);
    expect(data).toContain("LIMIT 200");
    expect(data).toContain("GROUP BY 1");
    expect(data).toContain('AS "last7DayCounts"');
    expect(data).not.toContain("reminderSent.findMany");
  });

  it("历史列表快照只读取渲染和分组所需的六个字段", () => {
    for (const field of [
      "id",
      "sentAt",
      "status",
      "dayOffset",
      "bucket",
      "errorMessage",
    ]) {
      expect(data).toContain(`"${field}"`);
    }
    expect(data).not.toContain("channelKey");
    expect(data).not.toContain('"channel"');
    expect(data).not.toContain('"userId"');
  });
});
