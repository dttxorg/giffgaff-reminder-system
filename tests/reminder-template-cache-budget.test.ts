import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("提醒模板页面查询预算", () => {
  const simCard = fs.readFileSync(
    "app/me/_components/sim-card.tsx",
    "utf8"
  );
  const preview = fs.readFileSync("app/_components/push-preview.tsx", "utf8");
  const adminPage = fs.readFileSync("app/admin/settings/page.tsx", "utf8");
  const cache = fs.readFileSync("lib/reminder-template-cache.ts", "utf8");
  const updateRoute = fs.readFileSync(
    "app/api/admin/settings/route.ts",
    "utf8"
  );

  it("三个页面读取点共用缓存，不再直接查询 Setting", () => {
    for (const source of [simCard, preview, adminPage]) {
      expect(source).toContain("getCachedReminderTemplate");
      expect(source).not.toContain("prisma.setting.findUnique");
    }
  });

  it("缓存带一小时兜底和可主动失效的 tag", () => {
    expect(cache).toContain("revalidate: 3600");
    expect(cache).toContain("tags: [REMINDER_TEMPLATE_TAG]");
    expect(cache).toContain('select: { value: true }');
  });

  it("管理员写入完成后才失效缓存", () => {
    const write = updateRoute.indexOf("await prisma.setting.upsert");
    const invalidate = updateRoute.indexOf(
      "invalidateReminderTemplateCache()"
    );
    expect(write).toBeGreaterThan(-1);
    expect(invalidate).toBeGreaterThan(write);
  });
});
