// Round 141: /admin 仪表盘"7 日失败 top N sim"卡片
// - 显示最近 7 天失败次数最多的 N 个 sim
// - 每行: 手机号 + 失败次数 (rose 高亮)
// - 0 失败时显示 "7 天无失败" (避免冷启动视觉噪声)
// - 点击手机号跳到 /admin/sims/[id] 排查
// - Round 148: 失败次数变 Link → 跳 /admin/reminders?simId=X&status=failed
//   (保持仪表盘钻取一致性: 跟 r145 渠道行、r147 7 日数字一样可点)

import Link from "next/link";
import type { TopFailingSim } from "@/lib/admin-reminder-stats";

export function TopFailingSims({ sims }: { sims: TopFailingSim[] }) {
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
            className="text-rose-500"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          7 日失败 top {sims.length || 3}
        </h2>
        <Link
          href="/admin/reminders?status=failed"
          className="text-xs text-indigo-600 hover:underline"
        >
          查看所有失败 →
        </Link>
      </div>
      {sims.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">
          ✓ 7 天无失败推送
        </p>
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
                href={`/admin/reminders?simId=${s.simId}&status=failed`}
                className="text-rose-700 font-medium whitespace-nowrap hover:underline"
              >
                {s.failedCount} 次失败
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
