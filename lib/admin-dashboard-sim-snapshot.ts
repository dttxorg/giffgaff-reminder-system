import { prisma } from "./db";
import { getShanghaiDayStart } from "./admin-dashboard-trends";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface AdminDashboardInWindowSim {
  simId: number;
  phoneNumber: string;
  dayOffset: number;
  daysLeft: number;
}

export interface AdminDashboardSimSnapshot {
  totalCount: number;
  activeCount: number;
  pausedCount: number;
  channelCount: number;
  boundCount: number;
  unboundCount: number;
  recentCount: number;
  recentActiveCount: number;
  recentPausedCount: number;
  inWindowCount: number;
  newDailyCounts: number[];
  bindTotalCounts: number[];
  bindBoundCounts: number[];
  inWindowSims: AdminDashboardInWindowSim[];
}

export const EMPTY_ADMIN_SIM_SNAPSHOT: AdminDashboardSimSnapshot = {
  totalCount: 0,
  activeCount: 0,
  pausedCount: 0,
  channelCount: 0,
  boundCount: 0,
  unboundCount: 0,
  recentCount: 0,
  recentActiveCount: 0,
  recentPausedCount: 0,
  inWindowCount: 0,
  newDailyCounts: [0, 0, 0, 0, 0, 0, 0],
  bindTotalCounts: [0, 0, 0, 0, 0, 0, 0],
  bindBoundCounts: [0, 0, 0, 0, 0, 0, 0],
  inWindowSims: [],
};

/**
 * 一次读取 SIM 表并在数据库端生成状态、窗口期、新增和历史绑定率快照。
 * 仅窗口期前 10 个号码作为明细返回，其余结果都是固定数量的计数。
 */
export async function getAdminDashboardSimSnapshot(
  now: Date
): Promise<AdminDashboardSimSnapshot> {
  const todayStart = getShanghaiDayStart(now);
  const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);
  const day1 = new Date(weekStart.getTime() + DAY_MS);
  const day2 = new Date(weekStart.getTime() + 2 * DAY_MS);
  const day3 = new Date(weekStart.getTime() + 3 * DAY_MS);
  const day4 = new Date(weekStart.getTime() + 4 * DAY_MS);
  const day5 = new Date(weekStart.getTime() + 5 * DAY_MS);
  const day6 = new Date(weekStart.getTime() + 6 * DAY_MS);
  const day7 = new Date(weekStart.getTime() + 7 * DAY_MS);

  const [snapshot] = await prisma.$queryRaw<AdminDashboardSimSnapshot[]>`
    WITH sim_base AS MATERIALIZED (
      SELECT
        sim."id",
        sim."phoneNumber",
        sim."status",
        sim."channelKey",
        sim."userId",
        sim."createdAt",
        usr."createdAt" AS "userCreatedAt",
        (
          (${todayStart} + INTERVAL '8 hours')::date
          - (
            COALESCE(sim."lastPortedAt", sim."activatedAt")
            + INTERVAL '8 hours'
          )::date
        )::int AS "dayOffset"
      FROM "Sim" sim
      LEFT JOIN "User" usr ON usr."id" = sim."userId"
    ),
    totals AS (
      SELECT
        COUNT(*)::int AS "totalCount",
        (COUNT(*) FILTER (WHERE "status" = 'active'))::int AS "activeCount",
        (COUNT(*) FILTER (WHERE "status" = 'paused'))::int AS "pausedCount",
        (COUNT(*) FILTER (WHERE "channelKey" <> ''))::int AS "channelCount",
        (COUNT(*) FILTER (WHERE "userId" IS NOT NULL))::int AS "boundCount",
        (COUNT(*) FILTER (WHERE "userId" IS NULL))::int AS "unboundCount",
        (COUNT(*) FILTER (WHERE "createdAt" >= ${weekStart}))::int
          AS "recentCount",
        (COUNT(*) FILTER (
          WHERE "createdAt" >= ${weekStart} AND "status" = 'active'
        ))::int AS "recentActiveCount",
        (COUNT(*) FILTER (
          WHERE "createdAt" >= ${weekStart} AND "status" = 'paused'
        ))::int AS "recentPausedCount",
        (COUNT(*) FILTER (
          WHERE "status" = 'active' AND "dayOffset" BETWEEN 170 AND 180
        ))::int AS "inWindowCount",
        jsonb_build_array(
          (COUNT(*) FILTER (
            WHERE "createdAt" >= ${weekStart} AND "createdAt" < ${day1}
          ))::int,
          (COUNT(*) FILTER (
            WHERE "createdAt" >= ${day1} AND "createdAt" < ${day2}
          ))::int,
          (COUNT(*) FILTER (
            WHERE "createdAt" >= ${day2} AND "createdAt" < ${day3}
          ))::int,
          (COUNT(*) FILTER (
            WHERE "createdAt" >= ${day3} AND "createdAt" < ${day4}
          ))::int,
          (COUNT(*) FILTER (
            WHERE "createdAt" >= ${day4} AND "createdAt" < ${day5}
          ))::int,
          (COUNT(*) FILTER (
            WHERE "createdAt" >= ${day5} AND "createdAt" < ${day6}
          ))::int,
          (COUNT(*) FILTER (
            WHERE "createdAt" >= ${day6} AND "createdAt" < ${day7}
          ))::int
        ) AS "newDailyCounts",
        jsonb_build_array(
          (COUNT(*) FILTER (WHERE "createdAt" < ${day1}))::int,
          (COUNT(*) FILTER (WHERE "createdAt" < ${day2}))::int,
          (COUNT(*) FILTER (WHERE "createdAt" < ${day3}))::int,
          (COUNT(*) FILTER (WHERE "createdAt" < ${day4}))::int,
          (COUNT(*) FILTER (WHERE "createdAt" < ${day5}))::int,
          (COUNT(*) FILTER (WHERE "createdAt" < ${day6}))::int,
          (COUNT(*) FILTER (WHERE "createdAt" < ${day7}))::int
        ) AS "bindTotalCounts",
        jsonb_build_array(
          (COUNT(*) FILTER (
            WHERE "userId" IS NOT NULL AND "userCreatedAt" < ${day1}
              AND "createdAt" < ${day1}
          ))::int,
          (COUNT(*) FILTER (
            WHERE "userId" IS NOT NULL AND "userCreatedAt" < ${day2}
              AND "createdAt" < ${day2}
          ))::int,
          (COUNT(*) FILTER (
            WHERE "userId" IS NOT NULL AND "userCreatedAt" < ${day3}
              AND "createdAt" < ${day3}
          ))::int,
          (COUNT(*) FILTER (
            WHERE "userId" IS NOT NULL AND "userCreatedAt" < ${day4}
              AND "createdAt" < ${day4}
          ))::int,
          (COUNT(*) FILTER (
            WHERE "userId" IS NOT NULL AND "userCreatedAt" < ${day5}
              AND "createdAt" < ${day5}
          ))::int,
          (COUNT(*) FILTER (
            WHERE "userId" IS NOT NULL AND "userCreatedAt" < ${day6}
              AND "createdAt" < ${day6}
          ))::int,
          (COUNT(*) FILTER (
            WHERE "userId" IS NOT NULL AND "userCreatedAt" < ${day7}
              AND "createdAt" < ${day7}
          ))::int
        ) AS "bindBoundCounts"
      FROM sim_base
    ),
    in_window AS (
      SELECT
        "id" AS "simId",
        "phoneNumber",
        "dayOffset",
        180 - "dayOffset" AS "daysLeft"
      FROM sim_base
      WHERE "status" = 'active' AND "dayOffset" BETWEEN 170 AND 180
      ORDER BY "daysLeft" ASC, "id" ASC
      LIMIT 10
    )
    SELECT
      totals.*,
      COALESCE(
        (SELECT jsonb_agg(item ORDER BY item."daysLeft", item."simId")
          FROM in_window item),
        '[]'::jsonb
      ) AS "inWindowSims"
    FROM totals
  `;

  return snapshot ?? EMPTY_ADMIN_SIM_SNAPSHOT;
}

/** 把紧凑快照还原成页面原有的 SIM 指标形状。 */
export function summarizeAdminSimSnapshot(
  snapshot: AdminDashboardSimSnapshot,
  now: Date
) {
  const todayStart = getShanghaiDayStart(now);
  const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);
  const newDaily = Array.from({ length: 7 }, (_, index) => ({
    date: new Date(weekStart.getTime() + index * DAY_MS + 12 * HOUR_MS),
    count: snapshot.newDailyCounts[index] ?? 0,
  }));
  const bindRateLast7Days = Array.from({ length: 7 }, (_, index) => {
    const totalSimCount = snapshot.bindTotalCounts[index] ?? 0;
    const boundCount = snapshot.bindBoundCounts[index] ?? 0;
    return {
      date: new Date(weekStart.getTime() + index * DAY_MS + 12 * HOUR_MS),
      boundCount,
      totalSimCount,
      bindRate:
        totalSimCount > 0
          ? Math.round((boundCount / totalSimCount) * 100)
          : 0,
    };
  });

  return {
    simCount: snapshot.totalCount,
    activeSimCount: snapshot.activeCount,
    pausedSimCount: snapshot.pausedCount,
    channelCount: snapshot.channelCount,
    inWindowSimCount: snapshot.inWindowCount,
    inWindowSims: snapshot.inWindowSims,
    simStatusBreakdown: {
      total: snapshot.totalCount,
      active: snapshot.activeCount,
      paused: snapshot.pausedCount,
      bound: snapshot.boundCount,
      unbound: snapshot.unboundCount,
    },
    newSimsLast7Days: {
      total: snapshot.recentCount,
      daily: newDaily,
    },
    bindRateLast7Days,
    userBindRateLast7Days: bindRateLast7Days.map((day) => ({
      ...day,
      unboundSimCount: day.totalSimCount - day.boundCount,
    })),
    pausedSimStats: {
      currentlyPaused: snapshot.pausedCount,
      recentlyPaused: snapshot.recentPausedCount,
      recentlyCreated: snapshot.recentCount,
    },
    activeSimStats: {
      currentlyActive: snapshot.activeCount,
      recentlyActivated: snapshot.recentActiveCount,
      recentlyCreated: snapshot.recentCount,
    },
  };
}
