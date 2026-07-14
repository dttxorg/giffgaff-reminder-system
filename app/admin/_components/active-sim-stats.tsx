// Round 204: /admin sim 状态卡加"近 7 日激活" 趋势
// - 显示当前 active 数量 + 近 7 日新增中 active 数
// - 可点 → /admin/sims?status=active 看完整 active sim 列表

import Link from "next/link";
import type { ActiveSimStats } from "@/lib/admin-reminder-stats";

export function ActiveSimStats({ stats }: { stats: ActiveSimStats }) {
  const { currentlyActive, recentlyActivated, recentlyCreated } = stats;
  const recentActiveRate = recentlyCreated > 0 ? Math.round((recentlyActivated / recentlyCreated) * 100) : 0;
  return (
    <Link
      href="/admin/sims?status=active"
      className="block mt-2 -mx-1 px-1 rounded hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-baseline justify-between text-xs text-slate-500 mb-1">
        <span>近 7 日激活</span>
        <span className={recentActiveRate > 0 ? "text-emerald-700 font-medium" : "text-slate-500"}>
          {recentlyActivated} / {recentlyCreated} ({recentActiveRate}%)
        </span>
      </div>
      <div className="text-xs text-slate-500">
        当前 active: <strong className="text-slate-900">{currentlyActive}</strong> 个
      </div>
    </Link>
  );
}
