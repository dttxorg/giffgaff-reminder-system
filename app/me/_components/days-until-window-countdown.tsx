"use client";

// Round 159: /me "距提醒开始" 实时倒计时
// - 当 NOT inWindow 时,把 server-rendered "距提醒开始还有 N 天"
//   升级为 client tick 实时倒计时("12 天 5 小时后")
// - 每小时重算一次 (提醒窗口至少 10 天后,分钟级精度不必要)
// - 不依赖 dayjs/date-fns,纯 Date 算
// - SSR 友好:初始值用 now=new Date(),client mount 后立即更新

import { useEffect, useState } from "react";

interface DaysUntilWindowCountdownProps {
  /** 提醒窗口开始的 dayOffset (170) */
  targetDayOffset: number;
  /** 当前 dayOffset (服务器算出,跟静态文本 "170-N 天" 一致) */
  currentDayOffset: number;
}

/**
 * 算"距提醒窗口开始(170 天)还有多久"的友好描述。
 * - 不足 1 天: "X 小时 Y 分后"
 * - 不足 10 天: "X 天 Y 小时后"
 * - 10+ 天: "X 天后"
 */
function describeUntilWindow(now: Date, targetTime: Date): string {
  const diffMs = targetTime.getTime() - now.getTime();
  if (diffMs <= 0) return "已到";

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 60) return `${diffMinutes} 分后`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    const m = diffMinutes % 60;
    if (m === 0) return `${diffHours} 小时后`;
    return `${diffHours} 小时 ${m} 分后`;
  }

  const diffDays = Math.floor(diffHours / 24);
  const h = diffHours % 24;
  if (h === 0) return `${diffDays} 天后`;
  // 10 天内显示小时精度
  if (diffDays < 10) return `${diffDays} 天 ${h} 小时后`;
  return `${diffDays} 天后`;
}

export function DaysUntilWindowCountdown({
  targetDayOffset,
  currentDayOffset,
}: DaysUntilWindowCountdownProps) {
  // SSR 友好:初始值用 now=new Date()
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    // 每小时重算一次 (提醒窗口是 N 天后,分钟级过度精度)
    const id = setInterval(() => setNow(new Date()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // 用 currentDayOffset 算"距目标的天数" (跟 server 静态文本 170-N 一致)
  // target = 当前时间 + (targetDayOffset - currentDayOffset) 天
  const daysRemaining = targetDayOffset - currentDayOffset;
  const targetTime = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);

  // sanity:如果 daysRemaining <= 0,显示 "已到"
  if (daysRemaining <= 0) {
    return <span className="text-slate-600">(已进入提醒窗口)</span>;
  }

  return (
    <span className="text-slate-600 font-medium">
      ({describeUntilWindow(now, targetTime)})
    </span>
  );
}
