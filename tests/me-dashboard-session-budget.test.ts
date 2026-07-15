import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("用户中心 Session 载荷预算", () => {
  const page = fs.readFileSync("app/me/page.tsx", "utf8");
  const session = fs.readFileSync("lib/session.ts", "utf8");
  const start = session.indexOf(
    "export const getCurrentUserDashboardContext"
  );
  const end = session.indexOf(
    "export const getCurrentUserSessionStatus"
  );
  const helper = session.slice(start, end);

  it("页面把 URL 选卡传给专用单查询上下文", () => {
    expect(page).toContain("getCurrentUserDashboardContext(requestedSimId)");
    expect(page).not.toContain("getCurrentUser()");
    expect(page).toContain("const activeSim = user.activeSim");
  });

  it("SQL 在数据库内完成优先级选卡", () => {
    expect(helper).toContain("ROW_NUMBER() OVER (");
    expect(helper).toContain("WHEN \"status\" = 'paused' THEN 4");
    expect(helper).toContain("WHEN \"dayOffset\" > 180 THEN 0");
    expect(helper).toContain("WHEN \"missingChannel\" THEN 2");
  });

  it("完整 token 和渠道密钥仅在排名第一的当前卡返回", () => {
    expect(helper).toContain(
      'CASE WHEN ranked."simRank" = 1 THEN ranked."portToken" END'
    );
    expect(helper).toContain(
      'CASE WHEN ranked."simRank" = 1 THEN ranked."channelKey" END'
    );
    expect(helper).toContain('(sim."channelKey" = \'\') AS "missingChannel"');
  });
});
