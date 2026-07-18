import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

describe("API proxy security gate", () => {
  it("拒绝跨站状态变更", async () => {
    const response = proxy(
      new NextRequest("https://baohao.example/api/me/password", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      })
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "请求来源校验失败",
    });
  });

  it("允许完全同源状态变更", () => {
    const response = proxy(
      new NextRequest("https://baohao.example/api/me/password", {
        method: "POST",
        headers: { origin: "https://baohao.example" },
      })
    );
    expect(response.status).toBe(200);
  });

  it("在进入路由前拒绝超大请求体", async () => {
    const response = proxy(
      new NextRequest("https://baohao.example/api/admin/sims/import", {
        method: "POST",
        headers: {
          origin: "https://baohao.example",
          "content-length": "1000001",
        },
      })
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ ok: false, error: "请求体过大" });
  });
});
