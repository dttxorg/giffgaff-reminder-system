import { dayOffsetFromBaseline, shanghaiParts } from "./bucket";

export interface PushHistoryPeriodReminder {
  sentAt: Date;
}

export interface PushHistoryDaySummary {
  date: Date;
  count: number;
  dayOffset: number;
}

export interface PushHistoryDailyCount {
  dayIndex: number;
  count: number;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SHANGHAI_OFFSET_MS = 8 * HOUR_MS;

function shanghaiTodayStart(now: Date): Date {
  const sp = shanghaiParts(now);
  return new Date(Date.UTC(sp.year, sp.month - 1, sp.day) - SHANGHAI_OFFSET_MS);
}

export function getPushHistoryWeekStart(now: Date): Date {
  return new Date(shanghaiTodayStart(now).getTime() - 6 * DAY_MS);
}

/**
 * 把一批轻量 sentAt 记录汇总成近 7 个上海日历日。
 * 页面只需一次范围查询，不再为每一天分别发 count 请求。
 */
export function summarizePushHistoryWeek(
  reminders: PushHistoryPeriodReminder[],
  baseline: Date,
  now: Date
): PushHistoryDaySummary[] {
  const weekStart = getPushHistoryWeekStart(now);
  const counts = Array.from({ length: 7 }, () => 0);

  for (const reminder of reminders) {
    const dayIndex = Math.floor(
      (reminder.sentAt.getTime() - weekStart.getTime()) / DAY_MS
    );
    if (dayIndex >= 0 && dayIndex <= 6) counts[dayIndex] += 1;
  }

  return summarizePushHistoryWeekCounts(
    counts.map((count, dayIndex) => ({ dayIndex, count })),
    baseline,
    now
  );
}

/** 从数据库返回的最多 7 个日计数生成图表数据。 */
export function summarizePushHistoryWeekCounts(
  dailyCounts: PushHistoryDailyCount[],
  baseline: Date,
  now: Date
): PushHistoryDaySummary[] {
  const todayStart = shanghaiTodayStart(now);
  const counts = Array.from({ length: 7 }, () => 0);
  for (const row of dailyCounts) {
    if (row.dayIndex >= 0 && row.dayIndex <= 6) {
      counts[row.dayIndex] = row.count;
    }
  }

  return counts.map((count, index) => {
    const dayStart = todayStart.getTime() - (6 - index) * DAY_MS;
    // 上海当天中午既适合格式化日期，也能稳定计算 dayOffset。
    const date = new Date(dayStart + 12 * HOUR_MS);
    return {
      date,
      count,
      dayOffset: dayOffsetFromBaseline(baseline, date),
    };
  });
}
