"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

/**
 * 判断 href 是否匹配当前 pathname。
 * "/admin" 只精确匹配;其他条目同时匹配自身和子路径(如 /admin/sims/123)。
 */
function isActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/admin") return pathname === "/admin";
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const prefetchOnIntent = (href: string) => {
    if (href !== pathname) router.prefetch(href);
  };

  return (
    <aside className="hidden md:flex md:w-56 bg-slate-900 text-slate-100 md:min-h-screen md:sticky md:top-0 md:h-screen flex-col">
      <div className="p-4 border-b border-slate-800">
        <div className="font-semibold">管理后台</div>
        <div className="text-xs text-slate-400 mt-0.5">SIM Reminder</div>
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
              aria-current={active ? "page" : undefined}
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
  );
}
