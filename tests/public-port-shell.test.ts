import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("公开保号页缓存与首屏数据预算", () => {
  const page = fs.readFileSync("app/p/[simId]/page.tsx", "utf8");
  const client = fs.readFileSync("app/p/[simId]/port-client.tsx", "utf8");

  it("服务端按 token 读取缓存数据，并保留按路径缓存", () => {
    expect(page).toContain('dynamic = "force-static"');
    expect(page).toContain("generateStaticParams");
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

  it("旧数字 URL 在服务端回填 token 并重定向", () => {
    expect(page).toContain("findSimByParam(simId)");
    expect(page).toContain("ensureSimPortToken(sim.id, sim.portToken)");
    expect(page).toContain("redirect(`/p/${portToken}`)");
  });
});
