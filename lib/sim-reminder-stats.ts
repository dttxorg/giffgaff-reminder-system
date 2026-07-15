import { prisma } from "./db";
import { shanghaiParts } from "./bucket";

type ReminderStatus = "success" | "failed";

export interface RecentReminderSummary {
  id: number;
  dayOffset: number;
  bucket: number;
  sentAt: Date;
  status: ReminderStatus;
}

export interface ReminderPeriodEvent {
  sentAt: Date;
  status: ReminderStatus;
}

export interface HourlySendSummary {
  hour: number;
  count: number;
}

export interface DailySendSummary {
  offset: number;
  date: Date;
  count: number;
}

export interface SimReminderStats {
  recentReminders: RecentReminderSummary[];
  lifetimeCount: number;
  successCount: number;
  failedCount: number;
  thisMonthCount: number;
  thisMonthFailedCount: number;
  todayCount: number;
  todayFailedCount: number;
  todayHourlySends: HourlySendSummary[];
  last7DaysForSim: DailySendSummary[];
}

interface ReminderSnapshotEvent {
  sentAt: Date | string;
  status: ReminderStatus;
}

interface RecentReminderSnapshot extends ReminderSnapshotEvent {
  id: number;
  dayOffset: number;
  bucket: number;
}

export interface SimReminderStatsSnapshot {
  recentReminders: RecentReminderSnapshot[];
  periodReminders: ReminderSnapshotEvent[];
  successCount: number;
  failedCount: number;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SHANGHAI_OFFSET_MS = 8 * HOUR_MS;

function periodBoundaries(now: Date) {
  const sp = shanghaiParts(now);
  const todayStart = new Date(
    Date.UTC(sp.year, sp.month - 1, sp.day) - SHANGHAI_OFFSET_MS
  );
  const monthStart = new Date(
    Date.UTC(sp.year, sp.month - 1, 1) - SHANGHAI_OFFSET_MS
  );
  const last7Start = new Date(todayStart.getTime() - 6 * DAY_MS);
  const activityStart = new Date(
    Math.min(monthStart.getTime(), last7Start.getTime())
  );
  return { todayStart, monthStart, last7Start, activityStart };
}

/**
 * 把一个月内的轻量推送记录一次性汇总成今日 / 本月 / 近 7 日视图。
 * 这些记录单卡每天最多 10 条，拉回后在内存汇总比多次 count 往返更快。
 */
export function summarizeReminderPeriod(
  reminders: ReminderPeriodEvent[],
  now: Date
): Pick<
  SimReminderStats,
  | "thisMonthCount"
  | "thisMonthFailedCount"
  | "todayCount"
  | "todayFailedCount"
  | "todayHourlySends"
  | "last7DaysForSim"
> {
  const { todayStart, monthStart, last7Start } = periodBoundaries(now);
  const hourly: HourlySendSummary[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
  }));
  const dailyCounts = Array.from({ length: 7 }, () => 0);

  let thisMonthCount = 0;
  let thisMonthFailedCount = 0;
  let todayCount = 0;
  let todayFailedCount = 0;

  for (const reminder of reminders) {
    const sentMs = reminder.sentAt.getTime();
    if (sentMs >= monthStart.getTime()) {
      thisMonthCount += 1;
      if (reminder.status === "failed") thisMonthFailedCount += 1;
    }
    if (sentMs >= todayStart.getTime()) {
      todayCount += 1;
      if (reminder.status === "failed") todayFailedCount += 1;
      const shanghaiHour = (reminder.sentAt.getUTCHours() + 8) % 24;
      hourly[shanghaiHour].count += 1;
    }

    const dayIndex = Math.floor((sentMs - last7Start.getTime()) / DAY_MS);
    if (dayIndex >= 0 && dayIndex <= 6) {
      dailyCounts[dayIndex] += 1;
    }
  }

  const last7DaysForSim: DailySendSummary[] = dailyCounts.map((count, index) => {
    const offset = 6 - index;
    const dayStart = todayStart.getTime() - offset * DAY_MS;
    return {
      offset,
      // 当天上海时间中午，避免格式化时落到相邻日期。
      date: new Date(dayStart + 12 * HOUR_MS),
      count,
    };
  });

  return {
    thisMonthCount,
    thisMonthFailedCount,
    todayCount,
    todayFailedCount,
    todayHourlySends: hourly,
    last7DaysForSim,
  };
}

function snapshotDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** 把数据库返回的紧凑快照还原成号码详情所需的完整统计。 */
export function summarizeSimReminderStatsSnapshot(
  snapshot: SimReminderStatsSnapshot,
  now: Date
): SimReminderStats {
  const recentReminders = snapshot.recentReminders.map((reminder) => ({
    ...reminder,
    sentAt: snapshotDate(reminder.sentAt),
  }));
  const periodReminders = snapshot.periodReminders.map((reminder) => ({
    ...reminder,
    sentAt: snapshotDate(reminder.sentAt),
  }));

  return {
    recentReminders,
    lifetimeCount: snapshot.successCount + snapshot.failedCount,
    successCount: snapshot.successCount,
    failedCount: snapshot.failedCount,
    ...summarizeReminderPeriod(periodReminders, now),
  };
}

/**
 * 单卡详情所需的全部推送统计。
 * 一次扫描同卡日志，在数据库内同时生成最近记录、生命周期计数和周期记录快照。
 */
export async function getSimReminderStats(
  simId: number,
  now: Date
): Promise<SimReminderStats> {
  const { activityStart } = periodBoundaries(now);

  const [snapshot] = await prisma.$queryRaw<SimReminderStatsSnapshot[]>`
    WITH reminder_base AS MATERIALIZED (
      SELECT "id", "dayOffset", "bucket", "sentAt", "status"
      FROM "ReminderSent"
      WHERE "simId" = ${simId}
    ),
    status_counts AS (
      SELECT
        (COUNT(*) FILTER (WHERE "status" = 'success'))::int
          AS "successCount",
        (COUNT(*) FILTER (WHERE "status" = 'failed'))::int
          AS "failedCount"
      FROM reminder_base
    ),
    recent_reminders AS (
      SELECT
        "id",
        "dayOffset",
        "bucket",
        "sentAt",
        "status"::text AS "status"
      FROM reminder_base
      ORDER BY "sentAt" DESC
      LIMIT 5
    ),
    period_reminders AS (
      SELECT "sentAt", "status"::text AS "status"
      FROM reminder_base
      WHERE "sentAt" >= ${activityStart}
    )
    SELECT
      COALESCE(
        (SELECT jsonb_agg(recent_row ORDER BY recent_row."sentAt" DESC)
          FROM recent_reminders recent_row),
        '[]'::jsonb
      ) AS "recentReminders",
      COALESCE(
        (SELECT jsonb_agg(period_row ORDER BY period_row."sentAt" ASC)
          FROM period_reminders period_row),
        '[]'::jsonb
      ) AS "periodReminders",
      status_counts."successCount",
      status_counts."failedCount"
    FROM status_counts
  `;

  return summarizeSimReminderStatsSnapshot(
    snapshot ?? {
      recentReminders: [],
      periodReminders: [],
      successCount: 0,
      failedCount: 0,
    },
    now
  );
}
