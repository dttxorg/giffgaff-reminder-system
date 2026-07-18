import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp } from "../lib/rate-limit";

describe("getClientIp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Vercel 环境优先使用平台注入地址的第一项", () => {
    vi.stubEnv("VERCEL", "1");
    const req = new Request("https://example.com", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.9, 198.51.100.7",
        "x-forwarded-for": "10.0.0.1",
      },
    });
    expect(getClientIp(req)).toBe("203.0.113.9");
  });

  it("Vercel 地址头缺失时使用 X-Forwarded-For 第一项", () => {
    vi.stubEnv("VERCEL", "1");
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.9, 198.51.100.7" },
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
