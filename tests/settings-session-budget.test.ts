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
    expect(page).toContain("getCurrentUserSettingsContext()");
    expect(page).not.toContain("getCurrentUser()");
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperEnd).toBeGreaterThan(helperStart);
  });

  it("专用上下文只保留选择器、表单和预览使用的 SIM 字段", () => {
    for (const field of [
      "id",
      "phoneNumber",
      "portToken",
      "activatedAt",
      "lastPortedAt",
      "channel",
      "channelKey",
    ]) {
      expect(helper).toContain(`${field}: true`);
    }
    expect(helper).not.toContain("status: true");
    expect(helper).not.toContain("createdAt: true");
  });
});
