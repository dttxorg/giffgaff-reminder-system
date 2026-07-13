// Round 168: /me "激活至今" 周年进度 widget
// - 显示 "激活 X 年 Y 天,距下个周年还差 N 天"
// - 大里程碑(1/2/3 周年)接近时 amber 高亮
// - 仅 years >= 1 时显示 (低于 1 年用户关注 100/200 天里程碑)

import type { AnniversaryProgress as Anniversary } from "@/lib/bucket";

export function AnniversaryProgress({
  progress,
}: {
  progress: Anniversary;
}) {
  const { years, daysLeft, totalDays } = progress;
  // 计算 X 年 Y 天(总天数 - 完整年*365 = 剩余天数)
  const remainingDays = totalDays - years * 365;

  // 大周年接近(≤ 30 天) → amber 高亮
  const isUpcoming = daysLeft <= 30;
  const tone = isUpcoming ? "text-amber-700" : "text-slate-500";

  return (
    <div className="text-xs text-slate-500 mt-1">
      激活{" "}
      <strong className="text-slate-700 font-semibold">
        {years} 年 {remainingDays} 天
      </strong>
      ,距下个周年还差{" "}
      <strong className={`font-semibold ${tone}`}>{daysLeft}</strong> 天
    </div>
  );
}
