import { describe, expect, it } from "vitest";
import { getClientIp } from "../lib/rate-limit";

describe("getClientIp", () => {
  it("优先使用 Vercel 注入的客户端地址", () => {
    const req = new Request("https://example.com", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.9",
        "x-forwarded-for": "10.0.0.1",
      },
    });
    expect(getClientIp(req)).toBe("203.0.113.9");
  });

  it("普通 X-Forwarded-For 取最右侧可信代理项", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 198.51.100.7" },
    });
    expect(getClientIp(req)).toBe("198.51.100.7");
  });

  it("拒绝非 IP 伪造值", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "attacker-controlled" },
    });
    expect(getClientIp(req)).toBe("unknown");
  });
});
