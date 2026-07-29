import Link from "next/link";
import {
  bucketForDay,
  dayOffsetFromBaseline,
  shanghaiParts,
} from "@/lib/bucket";
import { carrierPolicy, type CarrierType } from "@/lib/carrier";

interface PortCountdownHeroProps {
  /** sim 的上次保号日期(若有)或激活日期 */
  baseline: Date;
  /** sim.portToken,保号链接用 */
  portToken: string | null;
  /** sim.id，仅用于 token 异常时引导回账号设置，不生成公开数字链接 */
  simId: number;
  /** 客户端"现在",从父组件传入保证 SSR 一致 */
  now: Date;
  carrier?: CarrierType;
  reminderStartDay?: number;
  cycleDays?: number;
}

/**
 * Round 216: /me 顶部 hero 倒计时卡片
 *
 * 业务定位:在保号提醒窗口内(170-180),用大色块/大数字提示用户"该保号了",
 * 比 SimCard 内部的 alert 更醒目。窗口期外不渲染(避免噪音)。
 *
 * 设计:
 *  - 180 天当天:rose-600,文案"今天必须保号"
 *  - 179 天:orange-600,文案"明天是最后一天"
 *  - 170-178:amber-500,文案"还有 X 天" / "今天开始提醒"
 *  - 进度条:从激活到当前已激活天数的占比
 */
export function PortCountdownHero({
  baseline,
  portToken,
  simId,
  now,
  carrier = "giffgaff",
  reminderStartDay = carrierPolicy(carrier).reminderStartDay,
  cycleDays = carrierPolicy(carrier).cycleDays,
}: PortCountdownHeroProps) {
  const dayOffset = dayOffsetFromBaseline(baseline, now);
  if (dayOffset < reminderStartDay || dayOffset > cycleDays) return null;

  // 计算当前小时(上海时区)的 bucket,显示"今天第几次推送"
  const sp = shanghaiParts(now);
  const plan = bucketForDay(dayOffset, sp.hour, {
    carrier,
    reminderStartDay,
    cycleDays,
  });

  // 距离 180 天还剩多少
  const daysLeft = cycleDays - dayOffset;

  // 文案 + 配色
  const { headline, sub, gradient, ring, dotColor } = urgency(
    dayOffset,
    daysLeft,
    reminderStartDay,
    cycleDays
  );

  // 当天 bucket 进度(0/1/2),给用户"已经推了第 N 次"的实感
  const sentToday = plan ? plan.bucket + 1 : 0;
  const totalToday = plan ? plan.count : 0;

  const portHref = portToken
    ? `/p/${portToken}`
    : `/me/settings?simId=${simId}`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 mb-4 text-white ${gradient}`}
      role="alert"
      aria-live="polite"
    >
      {/* 装饰光斑 */}
      <div
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10"
        aria-hidden="true"
      />
      <div
        className="absolute -right-4 -bottom-12 w-24 h-24 rounded-full bg-white/5"
        aria-hidden="true"
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2 text-white/90">
          <span
            className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold tracking-wider uppercase">
            {carrier === "giffgaff" ? "Giffgaff" : "CTExcel"} · 保号窗口期
          </span>
        </div>

        <div className="text-3xl font-bold leading-tight mb-1">{headline}</div>
        <div className="text-sm text-white/90 mb-4">{sub}</div>

        {/* 进度条:从激活到 180 天的占比 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-white/80 mb-1">
            <span>第 {dayOffset} 天</span>
            <span>截止 {cycleDays} 天</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/90 rounded-full transition-all"
              style={{ width: `${Math.min(100, (dayOffset / cycleDays) * 100)}%` }}
            />
          </div>
        </div>

        {/* 当天推送实况(让用户知道系统没偷懒) */}
        {totalToday > 0 && (
          <div className="text-[11px] text-white/75 mb-4">
            今日已推送 {sentToday} / {totalToday} 次
          </div>
        )}

        <Link
          href={portHref}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-900 text-sm font-semibold shadow-sm hover:shadow transition-shadow ${ring}`}
        >
          立即去保号
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
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/**
 * 根据 dayOffset 决定配色 + 文案
 */
function urgency(
  dayOffset: number,
  daysLeft: number,
  reminderStartDay: number,
  cycleDays: number
): {
  headline: string;
  sub: string;
  gradient: string;
  ring: string;
  dotColor: string;
} {
  if (dayOffset === cycleDays) {
    return {
      headline: "今天必须保号",
      sub: `${cycleDays} 天窗口期最后一天，过了系统就停止提醒`,
      gradient: "bg-gradient-to-br from-rose-500 to-rose-700",
      ring: "ring-rose-200",
      dotColor: "bg-rose-200",
    };
  }
  if (dayOffset === cycleDays - 1) {
    return {
      headline: "明天是最后一天",
      sub: "建议今天就保,系统今天还会推 5 次",
      gradient: "bg-gradient-to-br from-orange-500 to-orange-700",
      ring: "ring-orange-200",
      dotColor: "bg-orange-200",
    };
  }
  if (dayOffset === cycleDays - 2) {
    return {
      headline: `还有 ${daysLeft} 天`,
      sub: `窗口期倒数，临近截止 ${cycleDays} 天提醒会变密`,
      gradient: "bg-gradient-to-br from-amber-500 to-amber-700",
      ring: "ring-amber-200",
      dotColor: "bg-amber-200",
    };
  }
  // 170-177
  return {
    headline:
      dayOffset === reminderStartDay ? "今天开始提醒" : `还有 ${daysLeft} 天`,
    sub: `系统从第 ${reminderStartDay} 天起自动推送，临近第 ${cycleDays} 天频率会增加`,
    gradient: "bg-gradient-to-br from-amber-400 to-amber-600",
    ring: "ring-amber-200",
    dotColor: "bg-amber-200",
  };
}
