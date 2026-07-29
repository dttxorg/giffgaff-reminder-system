// Round 143: 激活里程碑庆祝 banner
// - 在 dayOffset 命中 MILESTONES 时,显示绿色庆祝条
// - 复用 /me 现有 "已激活 N 天" 卡片上方的位置
// - 不用 emoji,用 SVG sparkle 图标 (跟 /me warning banner 风格统一)

import type { Milestone } from "@/lib/bucket";

export function MilestoneBanner({
  milestone,
  cycleDays = 180,
}: {
  milestone: Milestone;
  cycleDays?: number;
}) {
  return (
    <div className="mb-4 p-4 rounded-lg bg-emerald-50 border-2 border-emerald-300 text-emerald-900">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-emerald-600"
          >
            <path d="M12 2l2.4 7.4H22l-6.2 4.5L18.2 22 12 17.5 5.8 22l2.4-8.1L2 9.4h7.6z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="font-semibold">恭喜!{milestone.label}</div>
          <div className="text-sm text-emerald-800 mt-0.5">
            您的号码已使用 {milestone.days} 天，系统会按当前规则守护到第 {cycleDays} 天截止日。
          </div>
        </div>
      </div>
    </div>
  );
}
