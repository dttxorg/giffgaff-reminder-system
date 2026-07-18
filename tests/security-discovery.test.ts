import { describe, expect, it } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { GET as getSecurityText } from "../app/.well-known/security.txt/route";

describe("security discovery endpoints", () => {
  it("robots 禁止抓取 API、Bearer 页面和敏感入口", () => {
    const config = robots();
    expect(config.rules).toMatchObject({
      userAgent: "*",
      disallow: [
        "/api/",
        "/p/",
        "/me",
        "/admin",
        "/login",
        "/redeem",
      ],
    });
    expect(config.sitemap).toBe("https://baohao.681218.xyz/sitemap.xml");
  });

  it("sitemap 仅列出公开首页和帮助页", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toEqual([
      "https://baohao.681218.xyz",
      "https://baohao.681218.xyz/help",
      "https://baohao.681218.xyz/help/bark",
      "https://baohao.681218.xyz/help/pushplus",
      "https://baohao.681218.xyz/help/serverchan",
      "https://baohao.681218.xyz/help/telegram",
    ]);
    expect(urls.every((url) => !/\/(?:api|p|me|admin|login|redeem)(?:\/|$)/.test(url))).toBe(true);
  });

  it("security.txt 提供私密报告渠道与标准元数据", async () => {
    const response = getSecurityText();
    const body = await response.text();

    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(body).toContain("Contact: https://github.com/dttxorg/giffgaff-reminder-system/security/advisories/new");
    expect(body).toContain("Preferred-Languages: zh-CN, en");
    expect(body).toContain("Canonical: https://baohao.681218.xyz/.well-known/security.txt");
    expect(body).toMatch(/Expires: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  });
});
