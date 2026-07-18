import Link from "next/link";

export function AccountReminderMode({ simCount }: { simCount: number }) {
  return (
    <section
      className="mb-4 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 shadow-sm sm:p-5"
      aria-labelledby="account-reminder-mode-title"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M10 21h4" />
            <path d="M8.5 4.5 6.8 2.8" />
            <path d="m15.5 4.5 1.7-1.7" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="account-reminder-mode-title"
              className="text-sm font-semibold text-slate-900 sm:text-base"
            >
              已开启账号汇总提醒
            </h2>
            <span className="rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-[11px] font-medium text-indigo-700">
              每日最多 1 条
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">
            当前账号有 {simCount} 张活跃 SIM。进入保号期后，通知会汇总需要处理的尾号，登录后台即可统一完成保号。
          </p>
          <div className="mt-3 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>通知使用账号内第一张已配置的推送渠道</span>
            <Link
              href="/me/settings"
              className="inline-flex min-h-9 items-center font-medium text-indigo-700 hover:text-indigo-900"
            >
              管理通知渠道 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
