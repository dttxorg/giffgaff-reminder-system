"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Crumb {
  href?: string;
  label: string;
}

const LABELS: Record<string, string> = {
  "/admin": "仪表盘",
  "/admin/sims": "号码管理",
  "/admin/sims/new": "新增号码",
  "/admin/cards": "卡密管理",
  "/admin/cards/new": "生成卡密",
  "/admin/users": "用户",
  "/admin/reminders": "提醒日志",
  "/admin/settings": "文案设置",
  "/admin/login": "管理员登录",
};

/**
 * admin 页 breadcrumb。把 pathname 按 / 分段,每段对应一个 crumb。
 * 当前页(最后一段)不可点击。
 */
export function Breadcrumb() {
  const pathname = usePathname();

  // 把 pathname 分段,如 /admin/sims/3 → ["/admin", "/admin/sims", "/admin/sims/3"]
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let acc = "";
  for (const seg of segments) {
    acc += "/" + seg;
    // 最后一段如果像 id (数字/长串),用 "详情" 占位,避免显示 raw id
    const isLast = acc === pathname;
    let label = LABELS[acc];
    if (!label) {
      // 父路径能找到 label 则继续用父 label,最后一段显示 "详情"
      const parent = acc.substring(0, acc.lastIndexOf("/"));
      const parentLabel = LABELS[parent];
      label = isLast && parentLabel ? "详情" : seg;
    }
    crumbs.push({
      href: isLast ? undefined : acc,
      label,
    });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav className="text-xs text-slate-500 mb-3" aria-label="面包屑">
      <ol className="flex items-center gap-1 flex-wrap">
        {crumbs.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden="true">/</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-indigo-600 transition-colors">
                {c.label}
              </Link>
            ) : (
              <span className="text-slate-700" aria-current="page">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
