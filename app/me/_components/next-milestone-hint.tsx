// Round 155: /me "下一个里程碑"激励 hint
// - 显示在"已激活"大数字下方
// - 仅当未命中里程碑时(避免重复)
// - 距下个里程碑 ≤ 30 天时强调显示(快到了)
// - 距 100/365/730 等大节点 ≤ 7 天时换 amber 高亮

import type { Milestone } from "@/lib/bucket";

export function NextMilestoneHint({
  milestone,
  daysLeft,
}: {
  milestone: Milestone;
  daysLeft: number;
}) {
  // 大节点(100/365/730/1825)且 ≤ 7 天:amber 高亮
  const isBigMilestone = [100, 365, 730, 1825].includes(milestone.days);
  const tone =
    isBigMilestone && daysLeft <= 7
      ? "text-amber-700 font-medium"
      : "text-slate-500";
  return (
    <div
      className={`text-xs mt-1 ${tone}`}
      title={`还有 ${daysLeft} 天达到 ${milestone.label}`}
    >
      距 <strong className="font-semibold">{milestone.label}</strong> 还差{" "}
      <strong className="font-semibold">{daysLeft}</strong> 天
    </div>
  );
}
