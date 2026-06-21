// 保号提醒规则：基于 dayOffset（今天 - 激活/上次保号日期）和 hourOfDay 计算 bucket

// 业务全部按 Asia/Shanghai（北京时间，UTC+8）解读"日期"。
// Vercel serverless 跑在 UTC,如果直接用 getUTCFullYear / getUTCHours,
// 北京时间凌晨 0:00-8:00 会把"今天"算成昨天,bucket 窗口也会整体错位。
const SHANGHAI_TZ = "Asia/Shanghai";

/**
 * 把 Date 拆成 Asia/Shanghai 时区的 ymdhms。
 * hourCycle: "h23" 关键:不指定时 midnight 会返回 "24:00",而不是 "00:00"。
 */
export function shanghaiParts(d: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) parts[p.type] = p.value;
  return {
    year: +parts.year,
    month: +parts.month,
    day: +parts.day,
    hour: +parts.hour,
    minute: +parts.minute,
    second: +parts.second,
  };
}

/**
 * 各 dayOffset 对应的当天发送次数(2026-06-21 调整:170-172=1次,173-175=2次,176-178=3次)
 */
const COUNTS: Record<number, number> = {
  170: 1, 171: 1, 172: 1,
  173: 2, 174: 2, 175: 2,
  176: 3, 177: 3, 178: 3,
  179: 5,
  180: 10,
};

/**
 * 返回当天的发送计划；null 表示当天不应发
 * bucket 从 0 开始，0-indexed
 *
 * @param dayOffset 今天距基准日期的天数（向下取整）
 * @param hourOfDay 0-23 的小时数（Asia/Shanghai）
 */
export function bucketForDay(
  dayOffset: number,
  hourOfDay: number
): { count: number; bucket: number } | null {
  const count = COUNTS[dayOffset];
  if (!count) return null;
  if (hourOfDay < 0 || hourOfDay >= 24) return null;

  // 把 24 小时按 count 等分
  const windowSizeHours = 24 / count;
  const bucket = Math.min(count - 1, Math.floor(hourOfDay / windowSizeHours));
  return { count, bucket };
}

/**
 * 便捷：根据日期对象计算 dayOffset（按 Asia/Shanghai 时区算"日期差"）
 * @param baseline 激活日期或上次保号日期（业务语义是日期粒度）
 * @param now 当前时间
 */
export function dayOffsetFromBaseline(baseline: Date, now: Date = new Date()): number {
  const b = shanghaiParts(baseline);
  const n = shanghaiParts(now);
  // 用 Date.UTC 把 ymd 当成纯日历日算 diff,忽略时分秒
  const baselineDay = Date.UTC(b.year, b.month - 1, b.day);
  const nowDay = Date.UTC(n.year, n.month - 1, n.day);
  return Math.floor((nowDay - baselineDay) / (1000 * 60 * 60 * 24));
}

/**
 * 检查给定 dayOffset 是否在提醒窗口内（170-180）
 */
export function isInReminderWindow(dayOffset: number): boolean {
  return dayOffset >= 170 && dayOffset <= 180;
}
