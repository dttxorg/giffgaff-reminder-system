import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("公开保号页缓存与首屏数据预算", () => {
  const page = fs.readFileSync("app/p/[simId]/page.tsx", "utf8");
  const client = fs.readFileSync("app/p/[simId]/port-client.tsx", "utf8");

  it("服务端按 token 读取数据，但 Bearer 页面不进入共享缓存", () => {
    expect(page).toContain('dynamic = "force-dynamic"');
    expect(page).toContain("revalidate = 0");
    expect(page).toContain("await params");
    expect(page).toContain("getCachedPublicSim(simId)");
    expect(page).toContain("initialSim={initialSim}");
    expect(page).not.toContain("useParams");
  });

  it("客户端首屏不再水合后补取 SIM 数据", () => {
    expect(client).toContain('"use client"');
    expect(client).toContain("initialSim");
    expect(client).not.toContain("useParams");
    expect(client).not.toContain('fetch(`/api/p/${encodeURIComponent(simIdRaw)}`)');
    expect(client).toContain("/port`");
  });

  it("数字 ID 不再进入公开查询或重定向流程", () => {
    expect(page).toContain("looksLikeToken(simId)");
    expect(page).not.toContain("findSimByParam(simId)");
    expect(page).not.toContain("ensureSimPortToken");
    expect(page).not.toContain("redirect(");
  });
});
