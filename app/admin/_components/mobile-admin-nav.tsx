"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NavIcon } from "./nav-icon";

interface NavItem {
  href: string;
  label: string;
  icon: "dashboard" | "phone" | "ticket" | "users" | "log" | "settings";
}

const NAV: NavItem[] = [
  { href: "/admin", label: "仪表盘", icon: "dashboard" },
  { href: "/admin/sims", label: "号码管理", icon: "phone" },
  { href: "/admin/cards", label: "卡密管理", icon: "ticket" },
  { href: "/admin/users", label: "用户", icon: "users" },
  { href: "/admin/reminders", label: "提醒日志", icon: "log" },
  { href: "/admin/settings", label: "文案设置", icon: "settings" },
];

function isActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/admin") return pathname === "/admin";
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

/**
 * 移动端 admin 导航 — 汉堡按钮 + 抽屉菜单
 *
 * 设计:
 * - 汉堡按钮固定在左上(md 以下显示),点击切换抽屉
 * - 抽屉从左侧滑入,带半透明遮罩
 * - 选中项高亮 (与桌面侧栏一致)
 * - 链接点击 / Esc / 遮罩点击 / 路由变化 都关闭抽屉
 * - body 滚动锁(打开抽屉时 body 不能滚)
 * - 切换 breakpoint 时强制关闭(避免桌面模式残留 open 状态)
 */
export function MobileAdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const prefetchOnIntent = (href: string) => {
    if (href !== pathname) router.prefetch(href);
  };

  // 路由变化 → 自动关(避免跳页后抽屉还开着)
  // 用 ref 记录上一个 pathname,只在真的变化时关抽屉(避免初次挂载也触发)
  const lastPathRef = useRef(pathname);
  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 打开时锁 body 滚动
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  return (
    <>
      {/* 顶部条:仅移动端显示,固定在 main 顶部 */}
      <div className="md:hidden sticky top-0 z-30 bg-slate-900 text-slate-100 border-b border-slate-800 flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="打开菜单"
          aria-expanded={open}
          className="inline-flex items-center justify-center w-10 h-10 rounded-md hover:bg-slate-800 transition-colors"
        >
          {/* 汉堡图标 */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="font-semibold text-sm">管理后台</div>
        {/* 占位,让标题居中 */}
        <div className="w-10" aria-hidden="true" />
      </div>

      {/* 抽屉 — 仅 open 时挂载,避免 DOM 持续存在 */}
      {open && (
        <>
          {/* 遮罩 */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-slate-900/50 animate-in fade-in"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* 抽屉本体 */}
          <aside
            className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="管理后台导航"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold">管理后台</div>
                <div className="text-xs text-slate-400 mt-0.5">SIM Reminder</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭菜单"
                className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <nav className="p-2 space-y-0.5 text-sm flex-1">
              {NAV.map((item) => {
                const active = isActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onMouseEnter={() => prefetchOnIntent(item.href)}
                    onFocus={() => prefetchOnIntent(item.href)}
                    className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-2 border-t border-slate-800">
              <form action="/api/admin/auth/logout" method="post">
                <button
                  type="submit"
                  className="w-full text-left px-3 py-2 rounded text-slate-200 hover:bg-slate-800 hover:text-white text-sm transition-colors"
                >
                  退出登录
                </button>
              </form>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
