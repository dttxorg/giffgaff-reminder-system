// Round 140: /admin 仪表盘"今日按渠道"卡片
// - 4 渠道(serverchan / bark / pushplus / telegram)
// - 每行: 渠道名 + 今日总推送 + 成功 / 失败
// - 有失败时高亮 rose,纯成功时 slate
// - 0 推送的渠道显示 '—' 而非 '0',避免冷启动视觉噪声

import Link from "next/link";
import type { ChannelStat } from "@/lib/admin-reminder-stats";

const CHANNEL_LABELS: Record<string, string> = {
  serverchan: "Server酱",
  bark: "Bark",
  pushplus: "pushplus",
  telegram: "Telegram",
};

export function TodayChannelStats({ stats }: { stats: ChannelStat[] }) {
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
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          今日按渠道
        </h2>
        <Link
          href="/admin/reminders"
          className="text-xs text-indigo-600 hover:underline"
        >
          查看详细日志 →
        </Link>
      </div>
      <ul className="space-y-1.5">
        {stats.map((s) => {
          const label = CHANNEL_LABELS[s.channel] ?? s.channel;
          const hasFailed = s.failed > 0;
          const noActivity = s.total === 0;
          return (
            <li
              key={s.channel}
              className="flex items-center justify-between text-sm gap-3 py-1"
            >
              <span className="text-slate-700 font-medium min-w-[80px]">
                {label}
              </span>
              {noActivity ? (
                <span className="text-slate-300 text-xs">— 今日无活动</span>
              ) : (
                <>
                  <span
                    className={
                      hasFailed
                        ? "text-rose-700 font-medium"
                        : "text-slate-700"
                    }
                  >
                    {s.success > 0 && <>{s.success} 成功</>}
                    {s.failed > 0 && (
                      <span className={s.success > 0 ? "text-rose-600 ml-1" : "text-rose-700 font-medium"}>
                        {s.success > 0 ? "· " : ""}{s.failed} 失败
                      </span>
                    )}
                  </span>
                  <span className="text-slate-400 text-xs">
                    合计 {s.total}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
