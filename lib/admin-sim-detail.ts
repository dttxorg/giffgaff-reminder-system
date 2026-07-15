import { prisma } from "./db";

export interface AdminSimDetail {
  id: number;
  phoneNumber: string;
  activatedAt: string;
  lastPortedAt: string | null;
  status: "active" | "paused";
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

/** 编辑页与详情 API 共用的最小查询；两部分并行且不读取渠道密钥。 */
export async function getAdminSimDetail(
  simId: number
): Promise<AdminSimDetail | null> {
  const [sim, recentReminders] = await Promise.all([
    prisma.sim.findUnique({
      where: { id: simId },
      select: {
        id: true,
        phoneNumber: true,
        activatedAt: true,
        lastPortedAt: true,
        status: true,
        user: { select: { id: true, username: true } },
      },
    }),
    prisma.reminderSent.findMany({
      where: { simId },
      orderBy: { sentAt: "desc" },
      take: 5,
      select: {
        id: true,
        dayOffset: true,
        bucket: true,
        sentAt: true,
        status: true,
        errorMessage: true,
      },
    }),
  ]);

  if (!sim) return null;
  return {
    id: sim.id,
    phoneNumber: sim.phoneNumber,
    activatedAt: sim.activatedAt.toISOString().slice(0, 10),
    lastPortedAt: sim.lastPortedAt?.toISOString().slice(0, 10) ?? null,
    status: sim.status,
    user: sim.user,
    recentReminders: recentReminders.map((reminder) => ({
      ...reminder,
      sentAt: reminder.sentAt.toISOString().replace("T", " ").slice(0, 19),
    })),
  };
}
