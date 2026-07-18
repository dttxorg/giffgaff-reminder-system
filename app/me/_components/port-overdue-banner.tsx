import Link from "next/link";
import {
  dayOffsetFromBaseline,
} from "@/lib/bucket";

interface PortOverdueBannerProps {
  baseline: Date;
  portToken: string | null;
  simId: number;
  now: Date;
}

/**
 * Round 217: /me "已过保号窗口"警示
 *
 * 业务:dayOffset > 180 表示用户没在窗口期内保号,系统已停止提醒。
 * 此时 SIM 卡正面临"被回收"风险,要醒目提示用户立即保号。
 *
 * 设计:渐变红(slate + rose 边),比 hero 弱(没脉冲),但文案强("系统已停止提醒")
 */
export function PortOverdueBanner({
  baseline,
  portToken,
  simId,
  now,
}: PortOverdueBannerProps) {
  const dayOffset = dayOffsetFromBaseline(baseline, now);
  // 仅 180+ 渲染(0-180 范围内归 SimCard / PortCountdownHero 处理)
  if (dayOffset <= 180) return null;

  const daysOverdue = dayOffset - 180;
  const portHref = portToken
    ? `/p/${portToken}`
    : `/me/settings?simId=${simId}`;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-2xl p-4 mb-4 bg-gradient-to-br from-slate-50 to-rose-50 border-2 border-rose-200"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
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
            className="text-rose-600"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-rose-900 mb-0.5">
            系统已停止提醒 · 已过保号窗口 {daysOverdue} 天
          </div>
          <div className="text-xs text-rose-800/80 mb-3 leading-relaxed">
            180 天窗口期已过,运营商可能在近期回收号码。
            请立即保号 — 选最近的保号日期提交,系统会从那天重新计时 170 天。
          </div>
          <Link
            href={portHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors"
          >
            立即去保号
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
