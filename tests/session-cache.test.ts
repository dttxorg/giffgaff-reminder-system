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

  it("用户中心上下文使用 cache() 包裹", () => {
    expect(src).toMatch(
      /getCurrentUserDashboardContext\s*=\s*cache\s*\(\s*async\s*\(/
    );
  });

  it("getAdminSession 使用 cache() 包裹", () => {
    expect(src).toMatch(/getAdminSession\s*=\s*cache\s*\(\s*async\s*\(/);
  });

  it("轻量用户 session 状态也使用 cache() 包裹", () => {
    expect(src).toMatch(
      /getCurrentUserSessionStatus\s*=\s*cache\s*\(\s*async\s*\(/
    );
  });

  it("兑换页最小 session 摘要使用 cache() 包裹", () => {
    expect(src).toMatch(
      /getCurrentUserSessionSummary\s*=\s*cache\s*\(\s*async\s*\(/
    );
  });

  it("写接口使用的 userId session 查询也使用 cache() 包裹", () => {
    expect(src).toMatch(/getCurrentUserId\s*=\s*cache\s*\(\s*async\s*\(/);
  });

  it("推送历史最小 session 上下文也使用 cache() 包裹", () => {
    expect(src).toMatch(
      /getCurrentUserPushHistoryContext\s*=\s*cache\s*\(\s*async\s*\(/
    );
  });

  it("设置页最小 session 上下文也使用 cache() 包裹", () => {
    expect(src).toMatch(
      /getCurrentUserSettingsContext\s*=\s*cache\s*\(\s*async\s*\(/
    );
  });

  it("两个函数都是箭头函数(没有 async function NAME 声明)", () => {
    // 防止有人后续不小心改成 async function getCurrentUser() {...}(那种写法不能被 cache() 正确包裹)
    expect(src).not.toMatch(/async\s+function\s+getCurrentUserDashboardContext\b/);
    expect(src).not.toMatch(/async\s+function\s+getAdminSession\b/);
  });

  it("用户中心查询只为当前卡返回 token 和渠道密钥", () => {
    expect(src).toContain('AS "activePortToken"');
    expect(src).toContain('AS "activeChannelKey"');
    expect(src).toContain('CASE WHEN ranked."simRank" = 1');
  });

  it("管理员 session 只读取过期时间", () => {
    const adminStart = src.indexOf("export const getAdminSession");
    const adminEnd = src.indexOf("export async function destroyAdminSession");
    const adminHelper = src.slice(adminStart, adminEnd);
    expect(adminHelper).toContain("select: { expiresAt: true }");
  });
});
