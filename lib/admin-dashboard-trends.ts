import { shanghaiParts } from "./bucket";

export interface AdminDailySend {
  offset: number;
  date: Date;
  count: number;
}

export interface AdminSendTrends {
  last7DaysData: AdminDailySend[];
  last30DaysSends: AdminDailySend[];
  last90DaysSends: AdminDailySend[];
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SHANGHAI_OFFSET_MS = 8 * HOUR_MS;

export function getShanghaiDayStart(now: Date): Date {
  const sp = shanghaiParts(now);
  return new Date(Date.UTC(sp.year, sp.month - 1, sp.day) - SHANGHAI_OFFSET_MS);
}

export function summarizeAdminSendTrends(
  reminders: Array<{ sentAt: Date }>,
  now: Date
): AdminSendTrends {
  const todayStart = getShanghaiDayStart(now);
  const periodStart = new Date(todayStart.getTime() - 89 * DAY_MS);
  const counts = Array.from({ length: 90 }, () => 0);

  for (const reminder of reminders) {
    const dayIndex = Math.floor(
      (reminder.sentAt.getTime() - periodStart.getTime()) / DAY_MS
    );
    if (dayIndex >= 0 && dayIndex <= 89) counts[dayIndex] += 1;
  }

  return buildAdminSendTrendsFromCounts(counts, now);
}

/** 从数据库聚合后的 90 个每日计数构建与逐条日志完全相同的趋势形状。 */
export function buildAdminSendTrendsFromCounts(
  sourceCounts: readonly number[],
  now: Date
): AdminSendTrends {
  const todayStart = getShanghaiDayStart(now);
  const periodStart = new Date(todayStart.getTime() - 89 * DAY_MS);
  const counts = Array.from(
    { length: 90 },
    (_, index) => sourceCounts[index] ?? 0
  );
  const last90DaysSends = counts.map((count, index) => {
    const dayStart = periodStart.getTime() + index * DAY_MS;
    return {
      offset: 89 - index,
      // 上海当天中午，浏览器格式化时不会落入相邻日期。
      date: new Date(dayStart + 12 * HOUR_MS),
      count,
    };
  });

  return {
    last7DaysData: last90DaysSends.slice(-7),
    last30DaysSends: last90DaysSends.slice(-30),
    last90DaysSends,
  };
}
