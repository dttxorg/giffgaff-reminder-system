import { prisma } from "./db";
import {
  buildAdminSendTrendsFromCounts,
  getShanghaiDayStart,
} from "./admin-dashboard-trends";
import type { Channel } from "@/lib/generated/prisma/enums";

const DAY_MS = 24 * 60 * 60 * 1000;
const ALL_CHANNELS: Channel[] = [
  "serverchan",
  "bark",
  "pushplus",
  "telegram",
];

export interface AdminDashboardDailyCount {
  dayIndex: number;
  count: number;
}

export interface AdminDashboardChannelCount {
  channel: Channel;
  todayTotal: number;
  todaySuccess: number;
  todayFailed: number;
  yesterdayTotal: number;
  last7Total: number;
  last7Success: number;
  last7Failed: number;
  last90Total: number;
  last90Success: number;
  last90Failed: number;
}

export interface AdminDashboardSimCount {
  simId: number;
  phoneNumber: string;
  last7Total: number;
  last90Total: number;
  last7Failed: number;
  todayFailed: number;
}

export interface AdminDashboardReminderSnapshot {
  daily: AdminDashboardDailyCount[];
  channels: AdminDashboardChannelCount[];
  sims: AdminDashboardSimCount[];
}

export const EMPTY_ADMIN_REMINDER_SNAPSHOT: AdminDashboardReminderSnapshot = {
  daily: [],
  channels: [],
  sims: [],
};

/**
 * 一次扫描最近 90 天日志，在数据库内聚合为日期 / 渠道 / SIM 三组紧凑计数。
 * 返回行数上限约为 90 + 4 + SIM 数量，不再随每张卡每天的推送次数增长。
 */
export async function getAdminDashboardReminderSnapshot(
  now: Date
): Promise<AdminDashboardReminderSnapshot> {
  const todayStart = getShanghaiDayStart(now);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const periodStart = new Date(todayStart.getTime() - 89 * DAY_MS);
  const last7Exact = new Date(now.getTime() - 7 * DAY_MS);
  const last90Exact = new Date(now.getTime() - 90 * DAY_MS);

  const [snapshot] = await prisma.$queryRaw<AdminDashboardReminderSnapshot[]>`
    WITH reminder_base AS MATERIALIZED (
      SELECT "sentAt", "status", "channel", "simId"
      FROM "ReminderSent"
      WHERE "sentAt" >= ${last90Exact}
    ),
    daily AS (
      SELECT
        FLOOR(EXTRACT(EPOCH FROM ("sentAt" - ${periodStart})) / 86400)::int
          AS "dayIndex",
        COUNT(*)::int AS "count"
      FROM reminder_base
      WHERE "sentAt" >= ${periodStart}
      GROUP BY 1
    ),
    channel_counts AS (
      SELECT
        "channel"::text AS "channel",
        (COUNT(*) FILTER (WHERE "sentAt" >= ${todayStart}))::int
          AS "todayTotal",
        (COUNT(*) FILTER (
          WHERE "sentAt" >= ${todayStart} AND "status" = 'success'
        ))::int AS "todaySuccess",
        (COUNT(*) FILTER (
          WHERE "sentAt" >= ${todayStart} AND "status" = 'failed'
        ))::int AS "todayFailed",
        (COUNT(*) FILTER (
          WHERE "sentAt" >= ${yesterdayStart} AND "sentAt" < ${todayStart}
        ))::int AS "yesterdayTotal",
        (COUNT(*) FILTER (WHERE "sentAt" >= ${last7Exact}))::int
          AS "last7Total",
        (COUNT(*) FILTER (
          WHERE "sentAt" >= ${last7Exact} AND "status" = 'success'
        ))::int AS "last7Success",
        (COUNT(*) FILTER (
          WHERE "sentAt" >= ${last7Exact} AND "status" = 'failed'
        ))::int AS "last7Failed",
        COUNT(*)::int AS "last90Total",
        (COUNT(*) FILTER (WHERE "status" = 'success'))::int
          AS "last90Success",
        (COUNT(*) FILTER (WHERE "status" = 'failed'))::int
          AS "last90Failed"
      FROM reminder_base
      GROUP BY "channel"
    ),
    sim_counts AS (
      SELECT
        base."simId",
        sim."phoneNumber",
        (COUNT(*) FILTER (WHERE base."sentAt" >= ${last7Exact}))::int
          AS "last7Total",
        COUNT(*)::int AS "last90Total",
        (COUNT(*) FILTER (
          WHERE base."sentAt" >= ${last7Exact} AND base."status" = 'failed'
        ))::int AS "last7Failed",
        (COUNT(*) FILTER (
          WHERE base."sentAt" >= ${todayStart} AND base."status" = 'failed'
        ))::int AS "todayFailed"
      FROM reminder_base base
      INNER JOIN "Sim" sim ON sim."id" = base."simId"
      GROUP BY base."simId", sim."phoneNumber"
    )
    SELECT
      COALESCE(
        (SELECT jsonb_agg(daily_row ORDER BY daily_row."dayIndex")
          FROM daily daily_row),
        '[]'::jsonb
      ) AS "daily",
      COALESCE(
        (SELECT jsonb_agg(channel_row ORDER BY channel_row."channel")
          FROM channel_counts channel_row),
        '[]'::jsonb
      ) AS "channels",
      COALESCE(
        (SELECT jsonb_agg(sim_row ORDER BY sim_row."simId")
          FROM sim_counts sim_row),
        '[]'::jsonb
      ) AS "sims"
  `;

  return snapshot ?? EMPTY_ADMIN_REMINDER_SNAPSHOT;
}

function sum(
  rows: AdminDashboardChannelCount[],
  field: keyof Omit<AdminDashboardChannelCount, "channel">
) {
  return rows.reduce((total, row) => total + row[field], 0);
}

function channelStats(
  rows: AdminDashboardChannelCount[],
  period: "today" | "last7" | "last90"
) {
  const byChannel = new Map(rows.map((row) => [row.channel, row]));
  return ALL_CHANNELS.map((channel) => {
    const row = byChannel.get(channel);
    const total = row?.[`${period}Total`] ?? 0;
    const success = row?.[`${period}Success`] ?? 0;
    const failed = row?.[`${period}Failed`] ?? 0;
    return {
      channel,
      total,
      success,
      failed,
      failRate: total > 0 ? Math.round((failed / total) * 100) : 0,
    };
  });
}

function rankSims(
  rows: AdminDashboardSimCount[],
  field: "last7Total" | "last90Total" | "last7Failed" | "todayFailed",
  limit: number
) {
  return rows
    .filter((row) => row[field] > 0 && row.phoneNumber !== "")
    .map((row) => ({
      simId: row.simId,
      phoneNumber: row.phoneNumber,
      failedCount: row[field],
    }))
    .sort((a, b) => b.failedCount - a.failedCount || a.simId - b.simId)
    .slice(0, limit);
}

/** 把紧凑聚合快照还原成页面原有的提醒指标形状。 */
export function summarizeAdminReminderSnapshot(
  snapshot: AdminDashboardReminderSnapshot,
  now: Date
) {
  const dailyCounts = Array.from({ length: 90 }, () => 0);
  for (const row of snapshot.daily) {
    if (row.dayIndex >= 0 && row.dayIndex < 90) {
      dailyCounts[row.dayIndex] = row.count;
    }
  }
  const trends = buildAdminSendTrendsFromCounts(dailyCounts, now);
  const todayChannels = channelStats(snapshot.channels, "today");

  return {
    todaySent: sum(snapshot.channels, "todayTotal"),
    todayFailed: sum(snapshot.channels, "todayFailed"),
    failedRecent: sum(snapshot.channels, "last7Failed"),
    yesterdaySent: sum(snapshot.channels, "yesterdayTotal"),
    ...trends,
    todayChannelStats: todayChannels.map((stat) => ({
      channel: stat.channel,
      total: stat.total,
      success: stat.success,
      failed: stat.failed,
    })),
    topFailingSims: rankSims(snapshot.sims, "last7Failed", 3),
    topActiveSims: rankSims(snapshot.sims, "last7Total", 5),
    topActiveSims90d: rankSims(snapshot.sims, "last90Total", 5),
    todayFailingSims: rankSims(snapshot.sims, "todayFailed", 5),
    channelStatsLast7Days: channelStats(snapshot.channels, "last7"),
    channelStatsLast90Days: channelStats(snapshot.channels, "last90"),
  };
}
