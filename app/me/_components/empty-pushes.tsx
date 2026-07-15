/**
 * Round 224: /me/pushes 空状态
 *
 * 设计:大 icon + 标题 + 解释 + 上下文(状态/日期过滤)+ 清除链接
 * 区分"暂无推送记录"和"过滤后无结果"两种文案
 */
interface EmptyPushesProps {
  status?: "success" | "failed";
  hasDateFilter: boolean;
}

export function EmptyPushes({ status, hasDateFilter }: EmptyPushesProps) {
  const isFiltered = !!status || hasDateFilter;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-10 text-center">
      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-slate-400"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">
        {isFiltered ? "没有匹配的推送记录" : "还没有推送记录"}
      </h3>
      <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
        {isFiltered
          ? "试试调整日期范围或清除状态过滤"
          : "系统会在 Giffgaff 保号提醒窗口(170-180 天)开始自动推送,无需任何操作"}
      </p>
      {isFiltered && (
        <a
          href="/me/pushes"
          className="inline-block mt-3 text-xs text-indigo-600 hover:underline"
        >
          清除所有筛选
        </a>
      )}
    </div>
  );
}
