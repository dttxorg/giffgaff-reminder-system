import { prisma } from "./db";

export interface AdminReminderLogSummary {
  totalCount: number;
  totalToday: number;
  failedToday: number;
}

/** 一次表扫描返回提醒日志页的全局总数与今日状态概览。 */
export async function getAdminReminderLogSummary(
  todayStartUTC: Date
): Promise<AdminReminderLogSummary> {
  const [summary] = await prisma.$queryRaw<AdminReminderLogSummary[]>`
    SELECT
      COUNT(*)::int AS "totalCount",
      (COUNT(*) FILTER (WHERE "sentAt" >= ${todayStartUTC}))::int AS "totalToday",
      (COUNT(*) FILTER (
        WHERE "status" = 'failed' AND "sentAt" >= ${todayStartUTC}
      ))::int AS "failedToday"
    FROM "ReminderSent"
  `;
  return summary ?? { totalCount: 0, totalToday: 0, failedToday: 0 };
}
