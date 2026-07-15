import { prisma } from "./db";
import { dayOffsetFromBaseline } from "./bucket";
import {
  getShanghaiDayStart,
  summarizeAdminSendTrends,
} from "./admin-dashboard-trends";
import {
  getAdminDashboardReminderSnapshot,
  summarizeAdminReminderSnapshot,
} from "./admin-dashboard-reminder-snapshot";
import type { Channel } from "@/lib/generated/prisma/enums";

type ReminderStatus = "success" | "failed";
type SimStatus = "active" | "paused";

export interface AdminDashboardReminder {
  sentAt: Date;
  status: ReminderStatus;
  channel: Channel;
  simId: number;
}

export interface AdminDashboardSim {
  id: number;
  phoneNumber: string;
  activatedAt: Date;
  lastPortedAt: Date | null;
  status: SimStatus;
  channelKey: string;
  userId: number | null;
  createdAt: Date;
  user: { createdAt: Date } | null;
}

export interface AdminDashboardUser {
  createdAt: Date;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ALL_CHANNELS: Channel[] = [
  "serverchan",
  "bark",
  "pushplus",
  "telegram",
];

function channelStats(
  reminders: AdminDashboardReminder[]
): Array<{
  channel: Channel;
  total: number;
  success: number;
  failed: number;
  failRate: number;
}> {
  const stats = new Map(
    ALL_CHANNELS.map((channel) => [
      channel,
      { channel, total: 0, success: 0, failed: 0, failRate: 0 },
    ])
  );
  for (const reminder of reminders) {
    const stat = stats.get(reminder.channel);
    if (!stat) continue;
    stat.total += 1;
    if (reminder.status === "success") stat.success += 1;
    else stat.failed += 1;
  }
  return ALL_CHANNELS.map((channel) => {
    const stat = stats.get(channel)!;
    stat.failRate =
      stat.total > 0 ? Math.round((stat.failed / stat.total) * 100) : 0;
    return stat;
  });
}

function rankSims(
  reminders: AdminDashboardReminder[],
  phoneById: Map<number, string>,
  limit: number
) {
  const counts = new Map<number, number>();
  for (const reminder of reminders) {
    counts.set(reminder.simId, (counts.get(reminder.simId) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([simId, failedCount]) => ({
      simId,
      phoneNumber: phoneById.get(simId) ?? "",
      failedCount,
    }))
    .filter((sim) => sim.phoneNumber)
    .sort((a, b) => b.failedCount - a.failedCount || a.simId - b.simId)
    .slice(0, limit);
}

function dailyCreated(
  records: Array<{ createdAt: Date }>,
  weekStart: Date
) {
  const daily = Array.from({ length: 7 }, (_, index) => ({
    date: new Date(weekStart.getTime() + index * DAY_MS + 12 * HOUR_MS),
    count: 0,
  }));
  for (const record of records) {
    const index = Math.floor(
      (record.createdAt.getTime() - weekStart.getTime()) / DAY_MS
    );
    if (index >= 0 && index <= 6) daily[index].count += 1;
  }
  return daily;
}

/**
 * 把仪表盘需要的 SIM / 用户 / 90 日推送记录一次汇总为所有卡片数据。
 * 保持查询结果紧凑，不读取 channelKey 内容或推送错误正文。
 */
export function summarizeAdminDashboard(
  reminders: AdminDashboardReminder[],
  sims: AdminDashboardSim[],
  users: AdminDashboardUser[],
  now: Date
) {
  const todayStart = getShanghaiDayStart(now);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const weekCalendarStart = new Date(todayStart.getTime() - 6 * DAY_MS);
  const last7Exact = new Date(now.getTime() - 7 * DAY_MS);
  const last90Exact = new Date(now.getTime() - 90 * DAY_MS);
  const phoneById = new Map(sims.map((sim) => [sim.id, sim.phoneNumber]));

  const todayReminders: AdminDashboardReminder[] = [];
  const last7Reminders: AdminDashboardReminder[] = [];
  const last90Reminders: AdminDashboardReminder[] = [];
  let yesterdaySent = 0;
  let failedRecent = 0;

  for (const reminder of reminders) {
    const sentMs = reminder.sentAt.getTime();
    if (sentMs >= todayStart.getTime()) todayReminders.push(reminder);
    else if (sentMs >= yesterdayStart.getTime()) yesterdaySent += 1;
    if (sentMs >= last7Exact.getTime()) {
      last7Reminders.push(reminder);
      if (reminder.status === "failed") failedRecent += 1;
    }
    if (sentMs >= last90Exact.getTime()) last90Reminders.push(reminder);
  }

  const todayFailedReminders = todayReminders.filter(
    (reminder) => reminder.status === "failed"
  );
  const last7FailedReminders = last7Reminders.filter(
    (reminder) => reminder.status === "failed"
  );

  const activeSims = sims.filter((sim) => sim.status === "active");
  const pausedSims = sims.filter((sim) => sim.status === "paused");
  const recentlyCreatedSims = sims.filter(
    (sim) => sim.createdAt.getTime() >= weekCalendarStart.getTime()
  );
  const recentlyCreatedUsers = users.filter(
    (user) => user.createdAt.getTime() >= weekCalendarStart.getTime()
  );

  const allInWindowSims = activeSims
    .map((sim) => {
      const dayOffset = dayOffsetFromBaseline(
        sim.lastPortedAt ?? sim.activatedAt,
        now
      );
      return {
        simId: sim.id,
        phoneNumber: sim.phoneNumber,
        dayOffset,
        daysLeft: 180 - dayOffset,
      };
    })
    .filter((sim) => sim.dayOffset >= 170 && sim.dayOffset <= 180)
    .sort((a, b) => a.daysLeft - b.daysLeft || a.simId - b.simId);

  const bindRateLast7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(
      weekCalendarStart.getTime() + index * DAY_MS + 12 * HOUR_MS
    );
    const dayEnd = weekCalendarStart.getTime() + (index + 1) * DAY_MS;
    const simsAtDay = sims.filter((sim) => sim.createdAt.getTime() < dayEnd);
    const boundCount = simsAtDay.filter(
      (sim) =>
        sim.userId !== null &&
        sim.user !== null &&
        sim.user.createdAt.getTime() < dayEnd
    ).length;
    const totalSimCount = simsAtDay.length;
    return {
      date,
      boundCount,
      totalSimCount,
      bindRate:
        totalSimCount > 0
          ? Math.round((boundCount / totalSimCount) * 100)
          : 0,
    };
  });
  const userBindRateLast7Days = bindRateLast7Days.map((day) => ({
    ...day,
    unboundSimCount: day.totalSimCount - day.boundCount,
  }));

  const sendTrends = summarizeAdminSendTrends(reminders, now);
  const todayChannels = channelStats(todayReminders);

  return {
    simCount: sims.length,
    activeSimCount: activeSims.length,
    pausedSimCount: pausedSims.length,
    userCount: users.length,
    channelCount: sims.filter((sim) => sim.channelKey !== "").length,
    todaySent: todayReminders.length,
    todayFailed: todayFailedReminders.length,
    failedRecent,
    yesterdaySent,
    ...sendTrends,
    todayChannelStats: todayChannels.map((stat) => ({
      channel: stat.channel,
      total: stat.total,
      success: stat.success,
      failed: stat.failed,
    })),
    topFailingSims: rankSims(last7FailedReminders, phoneById, 3),
    topActiveSims: rankSims(last7Reminders, phoneById, 5),
    topActiveSims90d: rankSims(last90Reminders, phoneById, 5),
    todayFailingSims: rankSims(todayFailedReminders, phoneById, 5),
    channelStatsLast7Days: channelStats(last7Reminders),
    channelStatsLast90Days: channelStats(last90Reminders),
    inWindowSimCount: allInWindowSims.length,
    inWindowSims: allInWindowSims.slice(0, 10),
    simStatusBreakdown: {
      total: sims.length,
      active: activeSims.length,
      paused: pausedSims.length,
      bound: sims.filter((sim) => sim.userId !== null).length,
      unbound: sims.filter((sim) => sim.userId === null).length,
    },
    newSimsLast7Days: {
      total: recentlyCreatedSims.length,
      daily: dailyCreated(recentlyCreatedSims, weekCalendarStart),
    },
    newUsersLast7Days: {
      total: recentlyCreatedUsers.length,
      daily: dailyCreated(recentlyCreatedUsers, weekCalendarStart),
    },
    bindRateLast7Days,
    userBindRateLast7Days,
    pausedSimStats: {
      currentlyPaused: pausedSims.length,
      recentlyPaused: recentlyCreatedSims.filter(
        (sim) => sim.status === "paused"
      ).length,
      recentlyCreated: recentlyCreatedSims.length,
    },
    activeSimStats: {
      currentlyActive: activeSims.length,
      recentlyActivated: recentlyCreatedSims.filter(
        (sim) => sim.status === "active"
      ).length,
      recentlyCreated: recentlyCreatedSims.length,
    },
  };
}

/** 鉴权完成后固定只等待一轮；90 天日志在数据库内聚合后返回。 */
export async function getAdminDashboardData(now: Date) {
  const [sims, users, reminderSnapshot, recent] = await Promise.all([
    prisma.sim.findMany({
      select: {
        id: true,
        phoneNumber: true,
        activatedAt: true,
        lastPortedAt: true,
        status: true,
        channelKey: true,
        userId: true,
        createdAt: true,
        user: { select: { createdAt: true } },
      },
    }),
    prisma.user.findMany({ select: { createdAt: true } }),
    getAdminDashboardReminderSnapshot(now),
    prisma.reminderSent.findMany({
      take: 10,
      orderBy: { sentAt: "desc" },
      select: {
        id: true,
        sentAt: true,
        simId: true,
        dayOffset: true,
        bucket: true,
        status: true,
        errorMessage: true,
        sim: { select: { phoneNumber: true } },
      },
    }),
  ]);
  const phoneById = new Map(sims.map((sim) => [sim.id, sim.phoneNumber]));

  return {
    ...summarizeAdminDashboard([], sims, users, now),
    ...summarizeAdminReminderSnapshot(reminderSnapshot, phoneById, now),
    recent,
  };
}
