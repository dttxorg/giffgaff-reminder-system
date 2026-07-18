import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicBaseUrl } from "../lib/public-base-url";

describe("getPublicBaseUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("只接受无认证信息的 HTTPS 正式地址", () => {
    vi.stubEnv("PUBLIC_BASE_URL", "https://baohao.example/path");
    expect(getPublicBaseUrl()).toBe("https://baohao.example");
    vi.stubEnv("PUBLIC_BASE_URL", "http://baohao.example");
    expect(getPublicBaseUrl()).toBeNull();
  });

  it("生产缺失环境变量时使用项目正式域名", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_BASE_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(getPublicBaseUrl()).toBe("https://baohao.681218.xyz");
  });

  it("不使用请求 Host，Vercel 回退只接受主机字符", () => {
    vi.stubEnv("PUBLIC_BASE_URL", "");
    vi.stubEnv("VERCEL_URL", "project.vercel.app");
    expect(getPublicBaseUrl()).toBe("https://project.vercel.app");
    vi.stubEnv("VERCEL_URL", "evil.example/path");
    expect(getPublicBaseUrl()).toBe("http://localhost:3000");
  });
});
