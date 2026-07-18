import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("全局安全响应头", () => {
  it("关闭框架标识并为所有页面配置核心浏览器防护", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const rules = await nextConfig.headers!();
    const global = rules.find((rule) => rule.source === "/:path*")!;
    const headers = new Map(global.headers.map((header) => [header.key, header.value]));
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
  });

  it("API 和 Bearer 页面禁止共享缓存", async () => {
    const rules = await nextConfig.headers!();
    for (const source of ["/api/:path*", "/p/:path*"]) {
      const rule = rules.find((candidate) => candidate.source === source)!;
      expect(rule.headers).toContainEqual({
        key: "Cache-Control",
        value: "private, no-store, max-age=0, must-revalidate",
      });
    }
  });

  it("API、Bearer 页面和敏感入口禁止搜索引擎收录", async () => {
    const rules = await nextConfig.headers!();
    for (const source of [
      "/api/:path*",
      "/p/:path*",
      "/me/:path*",
      "/admin/:path*",
      "/login",
      "/redeem",
    ]) {
      const rule = rules.find((candidate) => candidate.source === source)!;
      expect(rule.headers).toContainEqual({
        key: "X-Robots-Tag",
        value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
      });
    }
  });
});
