import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("交互导航响应预算", () => {
  const login = fs.readFileSync("app/login/page.tsx", "utf8");
  const adminLogin = fs.readFileSync("app/admin/login/page.tsx", "utf8");
  const userNav = fs.readFileSync("app/_components/user-nav.tsx", "utf8");
  const actionBar = fs.readFileSync("app/me/_components/action-bar.tsx", "utf8");
  const settings = fs.readFileSync(
    "app/me/settings/settings-client.tsx",
    "utf8"
  );

  it("登录和退出跳转不再额外刷新目标页面", () => {
    for (const source of [login, adminLogin, userNav, actionBar]) {
      expect(source).not.toContain("router.refresh()");
      expect(source).toContain("startNavigation");
    }
  });

  it("渠道保存不再人为等待或强制跳页", () => {
    expect(settings).not.toMatch(/setTimeout\(\(\) => router\.push/);
    expect(settings).toContain("已保存，设置已立即生效");
    expect(settings).toContain("setSavedConfig({ channel, channelKey })");
  });
});
