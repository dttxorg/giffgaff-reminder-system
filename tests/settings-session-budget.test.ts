import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("设置页 Session 载荷预算", () => {
  const page = fs.readFileSync("app/me/settings/page.tsx", "utf8");
  const session = fs.readFileSync("lib/session.ts", "utf8");
  const helperStart = session.indexOf(
    "export const getCurrentUserSettingsContext"
  );
  const helperEnd = session.indexOf(
    "export interface CurrentUserSessionSummary"
  );
  const helper = session.slice(helperStart, helperEnd);

  it("设置页使用专用上下文，不加载用户中心完整卡片数据", () => {
    expect(page).toContain("getCurrentUserSettingsContext(requestedSimId)");
    expect(page).not.toContain("getCurrentUser()");
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperEnd).toBeGreaterThan(helperStart);
  });

  it("完整表单字段只在当前卡返回", () => {
    expect(helper).toContain(
      'CASE WHEN ranked."simRank" = 1 THEN ranked."portToken" END'
    );
    expect(helper).toContain(
      'CASE WHEN ranked."simRank" = 1 THEN ranked."channelKey" END'
    );
    expect(helper).toContain('AS "selectedChannel"');
    expect(helper).toContain('ranked."phoneNumber"');
  });
});
