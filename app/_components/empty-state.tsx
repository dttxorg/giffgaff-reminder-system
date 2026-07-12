import Link from "next/link";
import type { ReactNode } from "react";

interface EmptyStateAction {
  href: string;
  label: string;
  primary?: boolean;
}

type EmptyStateTone = "default" | "success" | "warning";

interface EmptyStateProps {
  title: string;
  hint?: string;
  actions?: EmptyStateAction[];
  /**
   * 自定义 icon:传 ReactNode 时覆盖默认 inbox icon
   */
  icon?: ReactNode;
  /**
   * 色调:影响 icon 颜色
   * - default (slate-300)
   * - success (emerald-300)
   * - warning (amber-300)
   */
  tone?: EmptyStateTone;
}

const TONE_ICON_CLASS: Record<EmptyStateTone, string> = {
  default: "text-slate-300",
  success: "text-emerald-300",
  warning: "text-amber-300",
};

/**
 * 默认空态 icon: Lucide 风格 inbox(收件箱) — 表达"暂无内容"
 */
function DefaultInboxIcon() {
  return (
    <svg
      width={48}
      height={48}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

/**
 * 通用空态组件: 给一个明确的标题 + 引导提示 + 可选操作按钮,
 * 替代单一的"暂无数据"占位符。
 *
 * 用法:
 *   <EmptyState
 *     title="还没有号码"
 *     hint="录入第一个号码让系统开始提醒"
 *     actions={[{ href: "/admin/sims/new", label: "+ 新增", primary: true }]}
 *   />
 */
export function EmptyState({
  title,
  hint,
  actions = [],
  icon,
  tone = "default",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className={`mb-3 ${TONE_ICON_CLASS[tone]}`}>
        {icon ?? <DefaultInboxIcon />}
      </div>
      <div className="text-sm font-medium text-slate-700">{title}</div>
      {hint && <div className="text-xs text-slate-500 mt-1 max-w-sm">{hint}</div>}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {actions.map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className={
                a.primary
                  ? "inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                  : "inline-flex items-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
              }
            >
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}