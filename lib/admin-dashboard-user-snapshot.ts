import { prisma } from "./db";
import { getShanghaiDayStart } from "./admin-dashboard-trends";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface AdminDashboardUserSnapshot {
  totalCount: number;
  dailyCounts: number[];
}

const EMPTY_USER_SNAPSHOT: AdminDashboardUserSnapshot = {
  totalCount: 0,
  dailyCounts: [0, 0, 0, 0, 0, 0, 0],
};

/** 一次扫描返回用户总数与最近 7 个上海自然日的新增计数。 */
export async function getAdminDashboardUserSnapshot(
  now: Date
): Promise<AdminDashboardUserSnapshot> {
  const todayStart = getShanghaiDayStart(now);
  const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);
  const day1 = new Date(weekStart.getTime() + DAY_MS);
  const day2 = new Date(weekStart.getTime() + 2 * DAY_MS);
  const day3 = new Date(weekStart.getTime() + 3 * DAY_MS);
  const day4 = new Date(weekStart.getTime() + 4 * DAY_MS);
  const day5 = new Date(weekStart.getTime() + 5 * DAY_MS);
  const day6 = new Date(weekStart.getTime() + 6 * DAY_MS);
  const day7 = new Date(weekStart.getTime() + 7 * DAY_MS);

  const [snapshot] = await prisma.$queryRaw<AdminDashboardUserSnapshot[]>`
    SELECT
      COUNT(*)::int AS "totalCount",
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
      ) AS "dailyCounts"
    FROM "User"
  `;

  return snapshot ?? EMPTY_USER_SNAPSHOT;
}

/** 还原页面原有的用户总数与近 7 日新增趋势形状。 */
export function summarizeAdminUserSnapshot(
  snapshot: AdminDashboardUserSnapshot,
  now: Date
) {
  const todayStart = getShanghaiDayStart(now);
  const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);
  const daily = Array.from({ length: 7 }, (_, index) => ({
    date: new Date(weekStart.getTime() + index * DAY_MS + 12 * HOUR_MS),
    count: snapshot.dailyCounts[index] ?? 0,
  }));

  return {
    userCount: snapshot.totalCount,
    newUsersLast7Days: {
      total: daily.reduce((total, day) => total + day.count, 0),
      daily,
    },
  };
}
