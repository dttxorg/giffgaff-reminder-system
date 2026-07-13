// Round 151: /admin 仪表盘"提醒窗口内 sim 列表"
// - 列出 dayOffset 170-180 的 sim
// - 按"距保号截止"剩最少天排前(最紧急在前)
// - 显示手机号 + 剩余天数
// - 点击手机号跳 /admin/sims/[id] 排查

import Link from "next/link";
import type { InWindowSim } from "@/lib/admin-reminder-stats";

export function InWindowSims({ sims }: { sims: InWindowSim[] }) {
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
            className="text-amber-500"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          提醒窗口内 sim
        </h2>
        <span className="text-xs text-slate-500">
          {sims.length} 个 · 170-180 天
        </span>
      </div>
      {sims.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">✓ 暂无 sim 在提醒窗口</p>
      ) : (
        <ul className="space-y-1.5">
          {sims.map((s) => {
            // daysLeft 越少越紧急: 0 = rose, 1-5 = orange, 6+ = amber
            const tone =
              s.daysLeft <= 1
                ? "text-rose-700 font-semibold"
                : s.daysLeft <= 5
                  ? "text-orange-700 font-medium"
                  : "text-amber-700";
            return (
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
                <span className={`whitespace-nowrap ${tone}`}>
                  剩 {s.daysLeft} 天
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
