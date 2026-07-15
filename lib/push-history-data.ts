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

interface PushHistorySimSnapshot {
  id: number;
  activatedAt: Date | string;
  lastPortedAt: Date | string | null;
}

interface PushHistoryPageRow extends PushHistorySnapshotRow {
  expiresAt: Date | string | null;
  sims: PushHistorySimSnapshot[];
}

export interface PushHistorySnapshot {
  reminders: ReminderForGroup[];
  last7DayCounts: PushHistoryDailyCount[];
}

export interface PushHistoryPageData extends PushHistorySnapshot {
  sims: Array<{
    id: number;
    activatedAt: Date;
    lastPortedAt: Date | null;
  }>;
}

interface PushHistoryQuery {
  sessionId: string;
  requestedSimId: number | null;
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
 * 一次数据库调用同时校验 Session，并返回 SIM 摘要、历史列表与近 7 日计数。
 * 列表最多 200 行，图表最多 7 行；无效 simId 自动回退账号下全部 SIM。
 */
export async function getPushHistoryPageData({
  sessionId,
  requestedSimId,
  status,
  sentAtRange,
  weekStart,
}: PushHistoryQuery): Promise<PushHistoryPageData | null> {
  const listFilters: Prisma.Sql[] = [
    Prisma.sql`"simId" IN (SELECT "id" FROM eligible_sims)`,
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

  const [snapshot] = await prisma.$queryRaw<PushHistoryPageRow[]>`
    WITH current_session AS (
      SELECT
        session."expiresAt",
        session."userId"
      FROM "UserSession" session
      WHERE session."id" = ${sessionId}
    ),
    owned_sims AS (
      SELECT
        sim."id",
        sim."activatedAt",
        sim."lastPortedAt"
      FROM "Sim" sim
      INNER JOIN current_session current
        ON current."userId" = sim."userId"
    ),
    requested_selection AS (
      SELECT EXISTS(
        SELECT 1
        FROM owned_sims
        WHERE "id" = ${requestedSimId}::int
      ) AS "isOwned"
    ),
    eligible_sims AS (
      SELECT owned."id"
      FROM owned_sims owned
      CROSS JOIN requested_selection requested
      WHERE ${requestedSimId}::int IS NULL
        OR NOT requested."isOwned"
        OR owned."id" = ${requestedSimId}::int
    ),
    list_rows AS (
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
      WHERE "simId" IN (SELECT "id" FROM eligible_sims)
        AND "sentAt" >= ${weekStart}
        AND "sentAt" < ${weekEnd}
      GROUP BY 1
    )
    SELECT
      (SELECT current."expiresAt" FROM current_session current LIMIT 1)
        AS "expiresAt",
      COALESCE(
        (SELECT jsonb_agg(sim_row ORDER BY sim_row."id")
          FROM owned_sims sim_row),
        '[]'::jsonb
      ) AS "sims",
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

  if (!snapshot?.expiresAt) return null;
  const expiresAt =
    snapshot.expiresAt instanceof Date
      ? snapshot.expiresAt
      : new Date(snapshot.expiresAt);
  if (expiresAt < new Date()) {
    await prisma.userSession.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }

  return {
    sims: snapshot.sims.map((sim) => ({
      id: sim.id,
      activatedAt:
        sim.activatedAt instanceof Date
          ? sim.activatedAt
          : new Date(sim.activatedAt),
      lastPortedAt:
        sim.lastPortedAt === null || sim.lastPortedAt instanceof Date
          ? sim.lastPortedAt
          : new Date(sim.lastPortedAt),
    })),
    ...normalizePushHistorySnapshot(snapshot),
  };
}
