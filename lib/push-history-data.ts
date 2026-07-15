import { prisma } from "./db";
import { Prisma } from "./generated/prisma/client";
import type { ReminderForGroup } from "./push-grouping";
import type { PushHistoryDailyCount } from "./push-history-stats";

type ReminderStatus = "success" | "failed";

interface PushHistoryReminderSnapshot {
  id: number;
  sentAt: Date | string;
  status: ReminderStatus;
  dayOffset: number;
  bucket: number;
  errorMessage: string | null;
}

interface PushHistorySnapshotRow {
  reminders: PushHistoryReminderSnapshot[];
  last7DayCounts: PushHistoryDailyCount[];
}

export interface PushHistorySnapshot {
  reminders: ReminderForGroup[];
  last7DayCounts: PushHistoryDailyCount[];
}

interface PushHistoryQuery {
  simIds: number[];
  status?: ReminderStatus;
  sentAtRange: { gte?: Date; lt?: Date };
  weekStart: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 把 JSONB 中的时间戳恢复成页面分组函数需要的 Date。 */
export function normalizePushHistorySnapshot(
  snapshot: PushHistorySnapshotRow | undefined
): PushHistorySnapshot {
  if (!snapshot) return { reminders: [], last7DayCounts: [] };
  return {
    reminders: snapshot.reminders.map((reminder) => ({
      ...reminder,
      sentAt:
        reminder.sentAt instanceof Date
          ? reminder.sentAt
          : new Date(reminder.sentAt),
    })),
    last7DayCounts: snapshot.last7DayCounts,
  };
}

/**
 * 一次数据库调用同时返回筛选后的历史列表与近 7 日紧凑计数。
 * 列表最多 200 行，图表最多 7 行，不再回传图表所用的逐条日志。
 */
export async function getPushHistorySnapshot({
  simIds,
  status,
  sentAtRange,
  weekStart,
}: PushHistoryQuery): Promise<PushHistorySnapshot> {
  if (simIds.length === 0) return { reminders: [], last7DayCounts: [] };

  const listFilters: Prisma.Sql[] = [
    Prisma.sql`"simId" IN (${Prisma.join(simIds)})`,
  ];
  if (status) {
    listFilters.push(Prisma.sql`"status" = ${status}::"SendStatus"`);
  }
  if (sentAtRange.gte) {
    listFilters.push(Prisma.sql`"sentAt" >= ${sentAtRange.gte}`);
  }
  if (sentAtRange.lt) {
    listFilters.push(Prisma.sql`"sentAt" < ${sentAtRange.lt}`);
  }
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);

  const [snapshot] = await prisma.$queryRaw<PushHistorySnapshotRow[]>`
    WITH list_rows AS (
      SELECT
        "id",
        "sentAt",
        "status"::text AS "status",
        "dayOffset",
        "bucket",
        "errorMessage"
      FROM "ReminderSent"
      WHERE ${Prisma.join(listFilters, " AND ")}
      ORDER BY "sentAt" DESC
      LIMIT 200
    ),
    week_counts AS (
      SELECT
        FLOOR(EXTRACT(EPOCH FROM ("sentAt" - ${weekStart})) / 86400)::int
          AS "dayIndex",
        COUNT(*)::int AS "count"
      FROM "ReminderSent"
      WHERE "simId" IN (${Prisma.join(simIds)})
        AND "sentAt" >= ${weekStart}
        AND "sentAt" < ${weekEnd}
      GROUP BY 1
    )
    SELECT
      COALESCE(
        (SELECT jsonb_agg(list_row ORDER BY list_row."sentAt" DESC)
          FROM list_rows list_row),
        '[]'::jsonb
      ) AS "reminders",
      COALESCE(
        (SELECT jsonb_agg(count_row ORDER BY count_row."dayIndex")
          FROM week_counts count_row),
        '[]'::jsonb
      ) AS "last7DayCounts"
  `;

  return normalizePushHistorySnapshot(snapshot);
}
