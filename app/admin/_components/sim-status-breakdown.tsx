// Round 152: /admin 仪表盘"sim 状态"分布
import Link from "next/link";
// - 4 维度: 总数 / 活跃 / 暂停 / 已绑 / 未绑
// - 进度条可视化
// - 数字 hover 显示百分比
// - Round 157: 加近 7 日新增 sim 趋势
// - Round 171: 加近 7 日新增 user 趋势 (镜像 sim,indigo 色)

import type { SimStatusBreakdown, SimDailyCreated } from "@/lib/admin-reminder-stats";

export function SimStatusBreakdown({
  stats,
  newSimsLast7Days,
  newUsersLast7Days,
  bindRateLast7Days,
}: {
  stats: SimStatusBreakdown;
  /** Round 157: 近 7 日新增 sim 统计 */
  newSimsLast7Days?: { total: number; daily: SimDailyCreated[] };
  /** Round 171: 近 7 日新增 user 统计 (optional) */
  newUsersLast7Days?: { total: number; daily: { date: Date; count: number }[] };
  /** Round 172: 近 7 日绑定率历史 (optional) */
  bindRateLast7Days?: { date: Date; boundCount: number; totalSimCount: number; bindRate: number }[];
}) {
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

      {/* Round 179: 活跃/暂停 进度条加点击跳转 /admin/sims?status=active/paused */}
      <Link
        href="/admin/sims?status=active"
        className="block mb-3 -mx-1 px-1 rounded hover:bg-slate-50 transition-colors"
      >
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
      </Link>

      {/* Round 179: 已绑/未绑 进度条加点击跳转 /admin/sims?bound=yes/no */}
      <Link
        href="/admin/sims?bound=no"
        className="block -mx-1 px-1 rounded hover:bg-slate-50 transition-colors"
      >
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
      </Link>

      {/* Round 172 + 192: 绑定率近 7 日变化 (mini sparkline,整块可点 → /admin/sims?bound=no) */}
      {bindRateLast7Days && bindRateLast7Days.length > 0 && (() => {
        // 找今天和 7 天前的绑定率,算 delta
        const today = bindRateLast7Days[bindRateLast7Days.length - 1].bindRate;
        const first = bindRateLast7Days[0].bindRate;
        const delta = today - first;
        const deltaTone = delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-700" : "text-slate-500";
        const deltaSign = delta > 0 ? "+" : "";
        return (
          <Link
            href="/admin/sims?bound=no"
            className="block mt-2 -mx-1 px-1 rounded hover:bg-slate-50 transition-colors"
          >
          <div>
            <div className="flex items-baseline justify-between text-xs text-slate-500 mb-1">
              <span>近 7 日绑定率</span>
              <span className={deltaTone}>
                {deltaSign}{delta}% 变化
              </span>
            </div>
            <ul
              className="flex items-end gap-px h-4"
              aria-label="近 7 日绑定率变化"
            >
              {bindRateLast7Days.map((d, i) => {
                const isToday = i === bindRateLast7Days.length - 1;
                return (
                  <li
                    key={d.date.toISOString()}
                    className="flex-1 h-full flex flex-col items-center justify-end"
                    title={`${d.date.toISOString().slice(0, 10)} 绑定率 ${d.bindRate}% (${d.boundCount}/${d.totalSimCount})`}
                  >
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: `${Math.max(1, d.bindRate / 100 * 16)}px`,
                        backgroundColor: isToday ? "#4f46e5" : "#a5b4fc",
                        minHeight: "1px",
                      }}
                      aria-label={`${d.date.toISOString().slice(0, 10)} 绑定率 ${d.bindRate}%`}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
          </Link>
        );
      })()}

      {/* Round 157: 近 7 日新增 sim 趋势 */}
      {newSimsLast7Days && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-baseline justify-between text-xs text-slate-600 mb-1.5">
            <span>近 7 日新增 sim</span>
            <span>
              <strong className="text-slate-900">{newSimsLast7Days.total}</strong> 个
              {newSimsLast7Days.total === 0 && (
                <span className="text-slate-400 ml-1">7 天无新增</span>
              )}
            </span>
          </div>
          <ul className="flex items-end gap-1 h-6" aria-label="近 7 日新增 sim 趋势">
            {newSimsLast7Days.daily.map((d, i) => {
              const max = Math.max(1, ...newSimsLast7Days.daily.map((x) => x.count));
              const heightPct = d.count > 0 ? (d.count / max) * 100 : 0;
              const isToday = i === 6;
              const mmdd = `${String(d.date.getUTCMonth() + 1).padStart(2, "0")}-${String(d.date.getUTCDate()).padStart(2, "0")}`;
              const ymd = `${d.date.getUTCFullYear()}-${mmdd.slice(0, 2)}-${mmdd.slice(3, 5)}`;
              return (
                <li
                  key={d.date.toISOString()}
                  className="flex-1 h-full flex flex-col items-center justify-end"
                >
                  {/* Round 187: 点击柱 → /admin/sims?from=&to= 当天 */}
                  <Link
                    href={`/admin/sims?from=${ymd}&to=${ymd}`}
                    className="block w-full rounded-sm hover:opacity-80 transition-opacity"
                    style={{
                      height: `${Math.max(1, (heightPct / 100) * 20)}px`,
                      backgroundColor: isToday ? "#10b981" : "#a7f3d0",
                      minHeight: "1px",
                    }}
                    title={`${mmdd} 新增 ${d.count} 个 (点击查看当日 sim)`}
                    aria-label={`${mmdd} 新增 ${d.count}`}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Round 171: 近 7 日新增 user 趋势 (镜像 sim,indigo 色系) */}
      {newUsersLast7Days && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-xs text-slate-600 mb-1.5">
            <span>近 7 日新增用户</span>
            <span>
              <strong className="text-slate-900">{newUsersLast7Days.total}</strong> 个
              {newUsersLast7Days.total === 0 && (
                <span className="text-slate-400 ml-1">7 天无新绑定</span>
              )}
            </span>
          </div>
          <ul className="flex items-end gap-1 h-6" aria-label="近 7 日新增 user 趋势">
            {newUsersLast7Days.daily.map((d, i) => {
              const max = Math.max(1, ...newUsersLast7Days.daily.map((x) => x.count));
              const heightPct = d.count > 0 ? (d.count / max) * 100 : 0;
              const isToday = i === 6;
              const mmdd = `${String(d.date.getUTCMonth() + 1).padStart(2, "0")}-${String(d.date.getUTCDate()).padStart(2, "0")}`;
              const ymd = `${d.date.getUTCFullYear()}-${mmdd.slice(0, 2)}-${mmdd.slice(3, 5)}`;
              return (
                <li
                  key={d.date.toISOString()}
                  className="flex-1 h-full flex flex-col items-center justify-end"
                >
                  {/* Round 188: 点击柱 → /admin/users?from=&to= 当天 */}
                  <Link
                    href={`/admin/users?from=${ymd}&to=${ymd}`}
                    className="block w-full rounded-sm hover:opacity-80 transition-opacity"
                    style={{
                      height: `${Math.max(1, (heightPct / 100) * 20)}px`,
                      backgroundColor: isToday ? "#6366f1" : "#c7d2fe",
                      minHeight: "1px",
                    }}
                    title={`${mmdd} 新增 ${d.count} 个 (点击查看当日 user)`}
                    aria-label={`${mmdd} 新增 ${d.count}`}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
