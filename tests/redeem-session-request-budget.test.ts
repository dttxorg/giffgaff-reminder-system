import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("兑换页 Session 请求预算", () => {
  const nav = fs.readFileSync("app/_components/user-nav.tsx", "utf8");
  const redeem = fs.readFileSync("app/redeem/redeem-experience.tsx", "utf8");
  const actionBar = fs.readFileSync(
    "app/me/_components/action-bar.tsx",
    "utf8"
  );
  const shared = fs.readFileSync("lib/client-session.ts", "utf8");

  it("导航和兑换体验复用同一个详细 Session 请求", () => {
    expect(nav).toContain("getRedeemSessionContext()");
    expect(redeem).toContain("getRedeemSessionContext()");
    expect(redeem).not.toContain('fetch("/api/auth/session?details=redeem"');
    expect(shared).toContain('fetch("/api/auth/session?details=redeem"');
  });

  it("共享层去重并发请求,且只做短时缓存", () => {
    expect(shared).toContain("if (inFlight) return inFlight");
    expect(shared).toContain("const CACHE_MS = 5_000");
    expect(shared).toContain("requestVersion === cacheVersion");
    expect(shared).toContain("inFlight = undefined");
  });

  it("两处退出入口都会清理短时 Session 缓存", () => {
    expect(nav).toContain("clearClientSessionCache()");
    expect(actionBar).toContain("clearClientSessionCache()");
  });
});
