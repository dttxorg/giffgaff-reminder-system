import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("SIM 编辑页查询与交互预算", () => {
  const page = fs.readFileSync("app/admin/sims/[id]/page.tsx", "utf8");
  const client = fs.readFileSync(
    "app/admin/sims/[id]/edit-sim-client.tsx",
    "utf8"
  );
  const loader = fs.readFileSync("lib/admin-sim-detail.ts", "utf8");
  const route = fs.readFileSync("app/api/admin/sims/[id]/route.ts", "utf8");

  it("页面在服务端完成鉴权与详情预取,客户端不再挂载后补请求", () => {
    expect(page).toContain("await requireAdmin()");
    expect(page).toContain("await getAdminSimDetail(simId)");
    expect(page).toContain("<EditSimClient initialSim={sim} />");
    expect(client).not.toContain("useEffect");
    expect(client).not.toContain('.then((data');
  });

  it("共享查询只读取表单和最近记录需要的字段", () => {
    expect(loader).toContain("await Promise.all([");
    expect(loader).toContain("select: {");
    expect(loader).not.toContain("include:");
    expect(loader).not.toContain("channelKey: true");
    expect(loader).not.toContain("portToken: true");
  });

  it("详情 API 复用同一个最小查询", () => {
    expect(route).toContain("await getAdminSimDetail(simId)");
    expect(route).not.toContain("include: { user:");
  });
});
