import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

/**
 * 用户态导航(用户中心 / 退出 OR 登录链接)
 *
 * 关键: 这是个 async server component,被 layout 用 <Suspense> 包裹。
 * - 之前 layout 直接 await getCurrentUser(),所有页面(连 /login、/help 都算)
 *   都要等 DB round-trip 完才能渲染 HTML。
 * - 拆出来后 layout 不再 await,页面先 streaming 出去,
 *   UserNav 后台查 DB,完成后流式插入。视觉上仅头部右侧短暂空白,
 *   主体内容不受影响。
 *
 * Fallback: 用同尺寸的占位 div,避免 nav 区域高度跳动。
 */
export async function UserNav() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <>
        <Link
          href="/me"
          className="px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
        >
          用户中心
        </Link>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-600"
          >
            退出
          </button>
        </form>
      </>
    );
  }
  return (
    <Link
      href="/login"
      className="px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
    >
      登录
    </Link>
  );
}

/**
 * nav 区域的占位 skeleton,与 UserNav 渲染后高度一致,
 * 避免 streaming 期间布局抖动。
 */
export function UserNavFallback() {
  // 宽度约等于"用户中心 + 退出"两个按钮的总宽度
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-1 text-sm"
      style={{ minWidth: "9rem", minHeight: "2rem" }}
    />
  );
}
