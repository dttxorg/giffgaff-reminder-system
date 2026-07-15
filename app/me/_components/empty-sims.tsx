import Link from "next/link";

/**
 * Round 222: /me "0 张卡"友好空状态
 *
 * 设计:大图标 + 标题 + 副标 + 主操作 + 副操作
 * 比原来小卡片更突出,适合作为 0 张卡用户的"第一个页面"
 */
export function EmptySims() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-10 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-50 flex items-center justify-center">
        <svg
          width={28}
          height={28}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-indigo-500"
        >
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold mb-2">还没有绑定 SIM 卡</h2>
      <p className="text-sm text-slate-600 mb-6 max-w-xs mx-auto leading-relaxed">
        用 16 位卡密绑定您的 Giffgaff SIM 卡,系统会在 170 天后自动开始推送保号提醒。
      </p>
      <Link
        href="/redeem"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm min-h-[44px]"
      >
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
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        去兑换卡密
      </Link>
      <p className="text-xs text-slate-400 mt-4">
        没有卡密?
        <a href="/help" className="text-indigo-600 hover:underline ml-1">
          查看获取方式
        </a>
      </p>
    </div>
  );
}
