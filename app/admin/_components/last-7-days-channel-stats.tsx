// Round 165: /admin 仪表盘"近 7 日按 channel"卡
// - 跟 TodayChannelStats (round 140) 镜像,但时间窗口 7 天
// - 每行: 渠道名 + 推送数 + 失败数 + 失败率
// - 失败率 > 5% 时 rose 配色, ≤ 5% emerald
// - 整行点击 → /admin/reminders?channel=X 排查 (跟 round 145 一致)

import Link from "next/link";
import type { Channel7DayStat } from "@/lib/admin-reminder-stats";

const CHANNEL_LABELS: Record<string, string> = {
  serverchan: "Server酱",
  bark: "Bark",
  pushplus: "pushplus",
  telegram: "Telegram",
};

export function Last7DaysChannelStats({
  stats,
  sortBy = "failRate",
  days = 7,
}: {
  stats: Channel7DayStat[];
  /** Round 166: 排序方式, "failRate" 按失败率倒序, "total" 按总推送数倒序 */
  sortBy?: "failRate" | "total";
  /** Round 167: 时间窗口(7 / 30 / 90 等),默认 7 */
  days?: number;
}) {
  // Round 166: 按失败率倒序 (失败率相同按 total 倒序),不健康渠道排前
  const sortedStats = [...stats].sort((a, b) => {
    if (sortBy === "total") {
      return b.total - a.total;
    }
    if (a.failRate !== b.failRate) return b.failRate - a.failRate;
    return b.total - a.total;
  });
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
            className="text-indigo-500"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          近 {days} 日按 channel
        </h2>
        <span className="text-xs text-slate-500">7 天累计</span>
      </div>
      <ul className="space-y-1.5">
        {sortedStats.map((s) => {
          const label = CHANNEL_LABELS[s.channel] ?? s.channel;
          const hasFailed = s.failed > 0;
          const noActivity = s.total === 0;
          // 失败率 > 5% 视为不健康
          const tone = s.failRate > 5 ? "text-rose-700" : "text-emerald-700";
          return (
            <li key={s.channel}>
              <Link
                href={`/admin/reminders?channel=${s.channel}`}
                className="flex items-center justify-between text-sm gap-3 py-1 -mx-1 px-1 rounded hover:bg-slate-50 transition-colors"
              >
                <span className="text-slate-700 font-medium min-w-[80px]">
                  {label}
                </span>
                {noActivity ? (
                  <span className="text-slate-300 text-xs">— {days} 天无活动</span>
                ) : (
                  <>
                    <span className={hasFailed ? "text-rose-700 font-medium" : "text-slate-700"}>
                      {s.success} 成功
                      {s.failed > 0 && (
                        <span className="text-rose-600 ml-1">· {s.failed} 失败</span>
                      )}
                    </span>
                    <span className="text-slate-400 text-xs">
                      合计 {s.total} · <span className={hasFailed ? tone : "text-slate-400"}>失败率 {s.failRate}%</span>
                    </span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
