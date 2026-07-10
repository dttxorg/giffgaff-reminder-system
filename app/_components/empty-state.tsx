import Link from "next/link";

interface EmptyStateAction {
  href: string;
  label: string;
  primary?: boolean;
}

interface EmptyStateProps {
  title: string;
  hint?: string;
  actions?: EmptyStateAction[];
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
export function EmptyState({ title, hint, actions = [] }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="text-3xl mb-2 text-slate-300" aria-hidden="true">
        ○
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
