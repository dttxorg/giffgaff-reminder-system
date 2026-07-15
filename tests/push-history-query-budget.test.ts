import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("推送历史查询载荷预算", () => {
  const page = fs.readFileSync("app/me/pushes/page.tsx", "utf8");
  const data = fs.readFileSync("lib/push-history-data.ts", "utf8");

  it("页面只读取 Session Cookie，账号与历史数据合并加载", () => {
    expect(page).toContain("getCurrentUserSessionId()");
    expect(page).toContain("getPushHistoryPageData({");
    expect(page).not.toContain("getCurrentUserPushHistoryContext");
    expect(page).not.toContain("getCurrentUser()");
    expect(data).toContain("WITH current_session AS");
    expect(data).toContain("owned_sims AS");
    expect(data).toContain('AS "sims"');
  });

  it("Session、SIM、历史列表与周图表合并为一次有界快照查询", () => {
    expect(page).not.toContain("prisma.");
    expect(data.match(/prisma\.\$queryRaw/g)).toHaveLength(1);
    expect(data).toContain("LIMIT 200");
    expect(data).toContain("GROUP BY 1");
    expect(data).toContain('AS "last7DayCounts"');
    expect(data).not.toContain("reminderSent.findMany");
  });

  it("快照不读取号码、公开 token 或渠道密钥", () => {
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
    expect(data).not.toContain("phoneNumber");
    expect(data).not.toContain("portToken");
    expect(data).not.toContain("channelKey");
    expect(data).not.toContain("username");
    expect(data).not.toContain('"channel"');
  });
});
