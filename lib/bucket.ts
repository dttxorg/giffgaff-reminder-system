// 保号提醒规则：基于 dayOffset（今天 - 激活/上次保号日期）和 hourOfDay 计算 bucket

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
 * @param hourOfDay 0-23 的小时数
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
 * 便捷：根据日期对象计算 dayOffset
 * @param baseline 激活日期或上次保号日期
 * @param now 当前时间
 */
export function dayOffsetFromBaseline(baseline: Date, now: Date = new Date()): number {
  const baselineUTC = Date.UTC(
    baseline.getUTCFullYear(),
    baseline.getUTCMonth(),
    baseline.getUTCDate()
  );
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((nowUTC - baselineUTC) / (1000 * 60 * 60 * 24));
}

/**
 * 检查给定 dayOffset 是否在提醒窗口内（170-180）
 */
export function isInReminderWindow(dayOffset: number): boolean {
  return dayOffset >= 170 && dayOffset <= 180;
}
