import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("管理员提醒重发性能预算", () => {
  const source = fs.readFileSync(
    "app/api/admin/reminders/[id]/resend/route.ts",
    "utf8"
  );

  it("并行读取提醒快照与模板", () => {
    expect(source).toContain("const [reminder, setting] = await Promise.all([");
  });

  it("复用已读取的 portToken，旧 SIM 不重复预查", () => {
    expect(source).toMatch(
      /ensureSimPortToken\(\s*reminder\.sim\.id,\s*reminder\.sim\.portToken\s*\)/
    );
    expect(source).not.toContain("ensureSimPortToken(reminder.sim.id);");
  });
});
