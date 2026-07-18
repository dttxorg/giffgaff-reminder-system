import { afterEach, describe, expect, it } from "vitest";
import { isTrustedMutationRequest } from "../lib/request-security";

function request(headers: Record<string, string> = {}, method = "POST") {
  return new Request("https://baohao.example/api/me/password", {
    method,
    headers,
  });
}

describe("isTrustedMutationRequest", () => {
  afterEach(() => {
    delete process.env.PUBLIC_BASE_URL;
  });

  it("允许安全方法", () => {
    expect(
      isTrustedMutationRequest(
        request({ origin: "https://evil.example" }, "GET")
      )
    ).toBe(true);
  });

  it("允许完全同源的状态变更", () => {
    expect(
      isTrustedMutationRequest(request({ origin: "https://baohao.example" }))
    ).toBe(true);
  });

  it("拒绝跨站与同站不同子域", () => {
    expect(
      isTrustedMutationRequest(request({ origin: "https://evil.example" }))
    ).toBe(false);
    expect(
      isTrustedMutationRequest(request({ origin: "https://evil.baohao.example" }))
    ).toBe(false);
  });

  it("拒绝 null Origin 和跨站 Fetch Metadata", () => {
    expect(isTrustedMutationRequest(request({ origin: "null" }))).toBe(false);
    expect(
      isTrustedMutationRequest(request({ "sec-fetch-site": "cross-site" }))
    ).toBe(false);
  });

  it("允许无浏览器来源头的 Bearer/服务端客户端", () => {
    expect(isTrustedMutationRequest(request())).toBe(true);
  });

  it("允许显式配置的生产域名", () => {
    process.env.PUBLIC_BASE_URL = "https://baohao.example/path";
    const req = new Request("https://internal.vercel.app/api/me/password", {
      method: "POST",
      headers: { origin: "https://baohao.example" },
    });
    expect(isTrustedMutationRequest(req)).toBe(true);
  });

  it("配置正式域名后不再信任请求 Host 派生的来源", () => {
    process.env.PUBLIC_BASE_URL = "https://baohao.example";
    const req = new Request("https://attacker-controlled-host.example/api/me/password", {
      method: "POST",
      headers: { origin: "https://attacker-controlled-host.example" },
    });
    expect(isTrustedMutationRequest(req)).toBe(false);
  });
});
