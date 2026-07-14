import Link from "next/link";

export interface SimTabItem {
  id: number;
  phoneTail4: string;
  status: "active" | "paused";
  /** 渠道未配置时,tab 上打个小红点提示 */
  missingChannel: boolean;
}

interface SimTabsProps {
  sims: SimTabItem[];
  activeSimId: number;
}

/**
 * 多卡切换 tabs(纯 server 组件,无 client 状态)
 *
 * 设计要点:
 *  - 用 Link + ?simId=X 切换(URL 是 state,刷新/分享保持选中)
 *  - 水平滚动:卡多时(< sm 屏)横向 scroll,右端渐变提示溢出
 *  - "+ 添加" tab 放在最后,直接跳 /redeem(已登录自动绑定到当前账号)
 *  - 每个 tab 显示 **** 1234 + 状态指示(主卡/未设渠道/已暂停)
 */
export function SimTabs({ sims, activeSimId }: SimTabsProps) {
  return (
    <div className="relative mb-4 -mx-4 sm:mx-0">
      <div
        className="overflow-x-auto px-4 sm:px-0 scrollbar-thin"
        // 用 sticky-ish 行为,tabs 始终在视口顶部
      >
        <div
          role="tablist"
          aria-label="SIM 卡切换"
          className="inline-flex gap-1.5 p-1 bg-slate-100 rounded-lg min-w-full sm:min-w-0"
        >
          {sims.map((sim, idx) => {
            const isActive = sim.id === activeSimId;
            const isPrimary = idx === 0;
            return (
              <Link
                key={sim.id}
                href={`/me?simId=${sim.id}`}
                role="tab"
                aria-selected={isActive}
                scroll={false}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
                title={
                  sim.missingChannel
                    ? "该 SIM 卡还没设置通知渠道,点此查看"
                    : sim.status === "paused"
                      ? "该 SIM 卡已暂停"
                      : undefined
                }
              >
                <span className="font-mono">**** {sim.phoneTail4}</span>
                {isPrimary && (
                  <span
                    className={`text-[10px] px-1 rounded ${
                      isActive
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    主
                  </span>
                )}
                {sim.missingChannel && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-rose-500"
                    aria-label="未设置通知渠道"
                  />
                )}
                {sim.status === "paused" && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-slate-400"
                    aria-label="已暂停"
                  />
                )}
              </Link>
            );
          })}
          {/* "+ 添加" tab,跳到 /redeem(已登录自动绑定到当前账号) */}
          <Link
            href="/redeem"
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-indigo-600 hover:bg-white/50 transition-colors"
            title="用新卡密绑定第 N+1 张 SIM 卡"
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            添加
          </Link>
        </div>
      </div>
      {/* 右端渐变提示溢出(仅在 sm 以下生效,overflow-x-auto 才需要提示) */}
      <div
        className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden"
        aria-hidden="true"
      />
    </div>
  );
}
