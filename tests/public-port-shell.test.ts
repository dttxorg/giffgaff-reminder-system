import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("公开保号页静态外壳", () => {
  const page = fs.readFileSync("app/p/[simId]/page.tsx", "utf8");
  const client = fs.readFileSync("app/p/[simId]/port-client.tsx", "utf8");

  it("服务端路由不读取 params，并启用按路径缓存", () => {
    expect(page).toContain('dynamic = "force-static"');
    expect(page).toContain("generateStaticParams");
    expect(page).toContain("<PortClient />");
    expect(page).not.toContain("useParams");
  });

  it("动态参数和数据请求保留在客户端组件", () => {
    expect(client).toContain('"use client"');
    expect(client).toContain("useParams");
    expect(client).toContain("/api/p/");
  });
});
