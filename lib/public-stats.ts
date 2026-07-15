import { prisma } from "./db";

export interface PublicStatsSnapshot {
  simCount: number;
  sentCount: number;
}

const EMPTY_STATS: PublicStatsSnapshot = { simCount: 0, sentCount: 0 };

/** 一次数据库调用返回首页所需的两个全局计数。 */
export async function getPublicStatsSnapshot(): Promise<PublicStatsSnapshot> {
  const [snapshot] = await prisma.$queryRaw<PublicStatsSnapshot[]>`
    SELECT
      (SELECT COUNT(*)::int FROM "Sim") AS "simCount",
      (
        SELECT COUNT(*)::int
        FROM "ReminderSent"
        WHERE "status" = 'success'
      ) AS "sentCount"
  `;
  return snapshot ?? EMPTY_STATS;
}
