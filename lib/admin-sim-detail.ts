import { prisma } from "./db";

interface AdminSimDetailRow {
  id: number;
  phoneNumber: string;
  activatedAt: Date | string;
  lastPortedAt: Date | string | null;
  status: "active" | "paused";
  carrier: "giffgaff" | "ctexcel";
  reminderStartDay: number;
  cycleDays: number;
  user: { id: number; username: string } | null;
  recentReminders: Array<{
    id: number;
    dayOffset: number;
    bucket: number;
    sentAt: Date | string;
    status: "success" | "failed";
    errorMessage: string | null;
  }>;
}

export interface AdminSimDetail {
  id: number;
  phoneNumber: string;
  activatedAt: string;
  lastPortedAt: string | null;
  status: "active" | "paused";
  carrier?: "giffgaff" | "ctexcel";
  reminderStartDay?: number;
  cycleDays?: number;
  user: { id: number; username: string } | null;
  recentReminders: Array<{
    id: number;
    dayOffset: number;
    bucket: number;
    sentAt: string;
    status: "success" | "failed";
    errorMessage: string | null;
  }>;
}

/** 编辑页与详情 API 共用的单次有界快照；不读取渠道密钥。 */
export async function getAdminSimDetail(
  simId: number
): Promise<AdminSimDetail | null> {
  const [snapshot] = await prisma.$queryRaw<AdminSimDetailRow[]>`
    SELECT
      sim."id",
      sim."phoneNumber",
      sim."activatedAt",
      sim."lastPortedAt",
      sim."status"::text AS "status",
      sim."carrier"::text AS "carrier",
      sim."reminderStartDay",
      sim."cycleDays",
      CASE
        WHEN owner."id" IS NULL THEN NULL
        ELSE jsonb_build_object(
          'id', owner."id",
          'username', owner."username"
        )
      END AS "user",
      COALESCE(
        (
          SELECT jsonb_agg(recent_row ORDER BY recent_row."sentAt" DESC)
          FROM (
            SELECT
              reminder."id",
              reminder."dayOffset",
              reminder."bucket",
              reminder."sentAt",
              reminder."status"::text AS "status",
              reminder."errorMessage"
            FROM "ReminderSent" reminder
            WHERE reminder."simId" = sim."id"
            ORDER BY reminder."sentAt" DESC
            LIMIT 5
          ) recent_row
        ),
        '[]'::jsonb
      ) AS "recentReminders"
    FROM "Sim" sim
    LEFT JOIN "User" owner ON owner."id" = sim."userId"
    WHERE sim."id" = ${simId}
    LIMIT 1
  `;

  if (!snapshot) return null;
  return {
    id: snapshot.id,
    phoneNumber: snapshot.phoneNumber,
    activatedAt: new Date(snapshot.activatedAt).toISOString().slice(0, 10),
    lastPortedAt: snapshot.lastPortedAt
      ? new Date(snapshot.lastPortedAt).toISOString().slice(0, 10)
      : null,
    status: snapshot.status,
    carrier: snapshot.carrier,
    reminderStartDay: snapshot.reminderStartDay,
    cycleDays: snapshot.cycleDays,
    user: snapshot.user,
    recentReminders: snapshot.recentReminders.map((reminder) => ({
      ...reminder,
      sentAt: new Date(reminder.sentAt)
        .toISOString()
        .replace("T", " ")
        .slice(0, 19),
    })),
  };
}
