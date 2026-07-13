// Round 170: /me "激活至今"周年 progress bar
// - 显示当前进度到下个周年(满 N 年)
// - 进度条 + 文字 (e.g. "已激活 1 年 135 天 (距 2 周年 230 天)")
// - 进度条: indigo 主色,1 周年里程碑后显示
// - 仅 years >= 1 显示 (跟 AnniversaryProgress 一致)

import type { AnniversaryProgress as Anniversary } from "@/lib/bucket";

export function AnniversaryProgressBar({
  progress,
}: {
  progress: Anniversary;
}) {
  const { years, daysLeft, totalDays } = progress;
  const remainingDays = totalDays - years * 365;
  // 下一个周年进度: 0% (刚到 N 周年) → 100% (差 1 天到 N+1 周年)
  const percent = Math.round(((365 - daysLeft) / 365) * 100);

  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between text-xs text-slate-500 mb-1">
        <span>
          激活 <strong className="text-slate-900 font-semibold">{years}</strong> 年{" "}
          <strong className="text-slate-900 font-semibold">{remainingDays}</strong> 天
        </span>
        <span title={`还差 ${daysLeft} 天到 ${years + 1} 周年`}>
          距 {years + 1} 周年 <strong className="text-slate-700 font-semibold">{daysLeft}</strong> 天
        </span>
      </div>
      <div
        className="h-2 rounded-full bg-slate-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`激活至今进度 ${percent}%,距 ${years + 1} 周年还差 ${daysLeft} 天`}
      >
        <div
          className="h-full bg-indigo-500 transition-all"
          style={{ width: `${percent}%` }}
          title={`已过 ${percent}%`}
        />
      </div>
    </div>
  );
}
