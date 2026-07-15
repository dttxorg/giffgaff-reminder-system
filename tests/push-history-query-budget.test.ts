import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("推送历史查询载荷预算", () => {
  const page = fs.readFileSync("app/me/pushes/page.tsx", "utf8");
  const session = fs.readFileSync("lib/session.ts", "utf8");
  const helperStart = session.indexOf(
    "export const getCurrentUserPushHistoryContext"
  );
  const helperEnd = session.indexOf(
    "export interface CurrentUserSessionSummary"
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

  it("历史列表只读取渲染和分组所需的六个字段", () => {
    const listQueryStart = page.indexOf("prisma.reminderSent.findMany({");
    const weeklyQueryStart = page.indexOf(
      "prisma.reminderSent.findMany({",
      listQueryStart + 1
    );
    const listQuery = page.slice(listQueryStart, weeklyQueryStart);

    for (const field of [
      "id",
      "sentAt",
      "status",
      "dayOffset",
      "bucket",
      "errorMessage",
    ]) {
      expect(listQuery).toContain(`${field}: true`);
    }
    expect(listQuery).not.toContain("channelKey");
    expect(listQuery).not.toContain("channel: true");
    expect(listQuery).not.toContain("userId: true");
    expect(listQuery).not.toContain("simId: true");
  });
});
