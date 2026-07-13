// Round 152: /admin 仪表盘"sim 状态"分布
// - 4 维度: 总数 / 活跃 / 暂停 / 已绑 / 未绑
// - 进度条可视化
// - 数字 hover 显示百分比

import type { SimStatusBreakdown } from "@/lib/admin-reminder-stats";

export function SimStatusBreakdown({ stats }: { stats: SimStatusBreakdown }) {
  const { total, active, paused, bound, unbound } = stats;
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
  const boundPct = total > 0 ? Math.round((bound / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-900 inline-flex items-center gap-1.5">
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-slate-500"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
          sim 状态
        </h2>
        <span className="text-xs text-slate-500">共 {total} 个</span>
      </div>

      {/* 活跃/暂停 状态条 */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between text-xs text-slate-600 mb-1">
          <span>活跃 / 暂停</span>
          <span>
            <strong className="text-emerald-700">{active}</strong> 活跃
            {paused > 0 && (
              <span className="text-slate-500 ml-1">· {paused} 暂停</span>
            )}
          </span>
        </div>
        <div
          className="h-2 rounded-full bg-slate-100 overflow-hidden"
          role="progressbar"
          aria-valuenow={activePct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`活跃率 ${activePct}%`}
        >
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${activePct}%` }}
            title={`活跃 ${active} / ${total} (${activePct}%)`}
          />
        </div>
      </div>

      {/* 绑定率 状态条 */}
      <div>
        <div className="flex items-baseline justify-between text-xs text-slate-600 mb-1">
          <span>已绑 / 未绑</span>
          <span>
            <strong className="text-indigo-700">{bound}</strong> 已绑
            {unbound > 0 && (
              <span className="text-slate-500 ml-1">· {unbound} 未绑</span>
            )}
          </span>
        </div>
        <div
          className="h-2 rounded-full bg-slate-100 overflow-hidden"
          role="progressbar"
          aria-valuenow={boundPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`绑定率 ${boundPct}%`}
        >
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${boundPct}%` }}
            title={`已绑 ${bound} / ${total} (${boundPct}%)`}
          />
        </div>
      </div>
    </div>
  );
}
