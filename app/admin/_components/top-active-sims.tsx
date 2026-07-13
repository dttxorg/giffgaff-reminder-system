// Round 160: /admin 仪表盘"近 7 日推送 top 5 sim"
// - 显示最近 7 天推送次数最多的 N 个 sim
// - 跟 TopFailingSims 镜像: 用 emerald (成功色) 不用 rose (失败色)
// - 0 推送时显示 "7 天无推送" (避免冷启动视觉噪声)
// - 点击手机号跳 /admin/sims/[id],点击数字跳 /admin/reminders?simId=X

import Link from "next/link";
import type { TopActiveSim } from "@/lib/admin-reminder-stats";

export function TopActiveSims({
  sims,
  days = 7,
}: {
  sims: TopActiveSim[];
  /** Round 163: 时间窗口(7 / 30 / 90 等),默认 7 */
  days?: number;
}) {
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
            className="text-emerald-500"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          {days} 日推送 top {sims.length || 5}
        </h2>
        <Link
          href="/admin/reminders"
          className="text-xs text-indigo-600 hover:underline"
        >
          查看所有日志 →
        </Link>
      </div>
      {sims.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">✓ 7 天无推送</p>
      ) : (
        <ul className="space-y-1.5">
          {sims.map((s) => (
            <li
              key={s.simId}
              className="flex items-center justify-between text-sm gap-3 py-1"
            >
              <Link
                href={`/admin/sims/${s.simId}`}
                className="font-mono text-indigo-600 hover:underline truncate"
              >
                {s.phoneNumber}
              </Link>
              <Link
                href={`/admin/reminders?simId=${s.simId}`}
                className="text-emerald-700 font-medium whitespace-nowrap hover:underline"
              >
                {s.failedCount} 次推送
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
