"use client";

// Round 139: 实时倒计时到下次推送
// - 跟 "下次推送 HH:MM" 一起显示在 /me 提醒窗口 alert 里
// - 每 60s 重新算一次(分钟级精度对提醒频率 1-10/天 足够)
// - 服务端渲染时给初始值,client mount 后开始 tick
// - 不依赖 dayjs/date-fns,纯 Date 算

import { useEffect, useState } from "react";

interface NextPushCountdownProps {
  /** 下次 bucket 开始时间 "HH:MM" (24h 制) */
  nextHHMM: string;
  /** 跨天时 nextHHMM="00:00",需要标记这是明天 */
  isTomorrow?: boolean;
}

/**
 * 算"距 nextHHMM 还有多久"的友好描述。
 * - < 1h: "N 分后"
 * - < 24h: "X 小时 Y 分后" / "X 小时后"(整点)
 * - 跨天: "明天 HH:MM" (此时 isTomorrow=true)
 */
function describeUntil(now: Date, nextHHMM: string): string {
  const [hh, mm] = nextHHMM.split(":").map(Number);
  const nowHH = now.getHours();
  const nowMM = now.getMinutes();
  let diffMinutes = (hh - nowHH) * 60 + (mm - nowMM);
  if (diffMinutes <= 0) diffMinutes += 24 * 60;

  if (diffMinutes < 60) return `${diffMinutes} 分后`;
  const h = Math.floor(diffMinutes / 60);
  const m = diffMinutes % 60;
  if (m === 0) return `${h} 小时后`;
  return `${h} 小时 ${m} 分后`;
}

export function NextPushCountdown({ nextHHMM, isTomorrow }: NextPushCountdownProps) {
  // SSR 友好:初始值用 now=new Date() (hydration mismatch 在客户端立即修正)
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    // 每 60s 重新算一次
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (isTomorrow) {
    // 跨天直接显示"明天 HH:MM"不显示相对时间(避免歧义)
    return <span className="text-slate-600">明天 {nextHHMM}</span>;
  }
  return <span className="text-slate-600">({describeUntil(now, nextHHMM)})</span>;
}
