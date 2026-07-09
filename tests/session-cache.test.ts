import { describe, it, expect } from "vitest";
import fs from "node:fs";

/**
 * 验证 getCurrentUser / getAdminSession 用了 React cache() 包裹。
 *
 * 注: 直接测 cache() 的运行时去重需要 React render context,
 * vitest 默认无,所以这里改成静态源码检查 — 确保我们的代码确实用了 cache()。
 * 真正的去重在生产环境由 Next.js + React 配合保证(单次请求内)。
 */
describe("session helpers are wrapped in React cache()", () => {
  const src = fs.readFileSync("lib/session.ts", "utf-8");

  it("session.ts 顶部 import 了 React cache", () => {
    expect(src).toMatch(/import\s+\{\s*cache\s*\}\s+from\s+["']react["']/);
  });

  it("getCurrentUser 使用 cache() 包裹(箭头函数表达式,不是函数声明)", () => {
    // 期望: getCurrentUser = cache(async () => {
    expect(src).toMatch(/getCurrentUser\s*=\s*cache\s*\(\s*async\s*\(/);
  });

  it("getAdminSession 使用 cache() 包裹", () => {
    expect(src).toMatch(/getAdminSession\s*=\s*cache\s*\(\s*async\s*\(/);
  });

  it("两个函数都是箭头函数(没有 async function NAME 声明)", () => {
    // 防止有人后续不小心改成 async function getCurrentUser() {...}(那种写法不能被 cache() 正确包裹)
    expect(src).not.toMatch(/async\s+function\s+getCurrentUser\b/);
    expect(src).not.toMatch(/async\s+function\s+getAdminSession\b/);
  });
});
