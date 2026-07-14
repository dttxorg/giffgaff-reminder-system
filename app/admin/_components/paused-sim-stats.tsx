// Round 203: /admin sim 状态卡加"近 7 日暂停" 趋势
// - 显示当前 paused 数量 + 近 7 日新增中 paused 数
// - 可点 → /admin/sims?status=paused 看完整 paused sim 列表

import Link from "next/link";
import type { PausedSimStats } from "@/lib/admin-reminder-stats";

export function PausedSimStats({ stats }: { stats: PausedSimStats }) {
  const { currentlyPaused, recentlyPaused, recentlyCreated } = stats;
  const recentPausedRate = recentlyCreated > 0 ? Math.round((recentlyPaused / recentlyCreated) * 100) : 0;
  return (
    <Link
      href="/admin/sims?status=paused"
      className="block mt-2 -mx-1 px-1 rounded hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-baseline justify-between text-xs text-slate-500 mb-1">
        <span>近 7 日暂停</span>
        <span className={recentPausedRate > 0 ? "text-rose-700 font-medium" : "text-slate-500"}>
          {recentlyPaused} / {recentlyCreated} ({recentPausedRate}%)
        </span>
      </div>
      <div className="text-xs text-slate-500">
        当前 paused: <strong className="text-slate-900">{currentlyPaused}</strong> 个
      </div>
    </Link>
  );
}
