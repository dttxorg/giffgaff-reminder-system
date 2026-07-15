import Link from "next/link";

interface ActionBarProps {
  /** 当前 activeSim 的 id(用于跳转到对应 sim 的 settings) */
  activeSimId: number | null;
}

/**
 * Round 218: /me 底部 action bar
 *
 * 设计:
 *  - 三个核心动作(设置 / 绑定更多 / 退出)做成 pill 按钮
 *  - 退出用次要色(灰色),其他用 indigo
 *  - 每个按钮带 icon + 文字,移动端可点击区域足够大
 *  - flex-wrap 自动换行
 */
export function ActionBar({ activeSimId }: ActionBarProps) {
  return (
    <div className="mt-6 pt-5 border-t border-slate-200">
      <nav
        aria-label="账号操作"
        className="flex items-center justify-center gap-2 flex-wrap"
      >
        <Link
          href={`/me/settings?simId=${activeSimId ?? ""}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors min-h-[36px]"
          title="修改密码 / 通知渠道 / 激活日期"
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          设置
        </Link>

        <Link
          href="/redeem"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors min-h-[36px]"
          title="用新卡密把第 N+1 张 SIM 卡绑定到本账号"
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          绑定更多 SIM 卡
        </Link>

        <Link
          href="/me/pushes"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors min-h-[36px]"
          title="查看推送历史"
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          推送历史
        </Link>

        <Link
          href="/api/auth/logout"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-slate-500 text-sm hover:bg-slate-100 hover:text-slate-700 transition-colors min-h-[36px]"
          title="退出登录"
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          退出
        </Link>
      </nav>
    </div>
  );
}
