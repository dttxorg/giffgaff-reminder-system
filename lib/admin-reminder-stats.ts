// /admin 仪表盘的"今日按渠道"统计查询
//
// 设计动机:
// - 管理员日常排查推送问题时,最常见的是"某个渠道今天是不是特别多失败"
// - 现在 /admin/reminders 有 channel 过滤,但要先跳转再筛选
// - 仪表盘直接显示"今日 4 渠道的推送统计",admin 一眼看出哪个渠道在出问题
//
// 业务规则:
// - 按 channel 分组(severchan / bark / pushplus / telegram)
// - 每个渠道显示: 今日总推送 / 成功 / 失败
// - 0 推送的渠道也显示,admin 知道"这个渠道今天没活动"
//
// 数据来源: ReminderSent join User 取 channel

import { prisma } from "./db";
import type { Channel } from "@/lib/generated/prisma/enums";

export interface ChannelStat {
  channel: Channel;
  total: number;
  success: number;
  failed: number;
}

const ALL_CHANNELS: Channel[] = ["serverchan", "bark", "pushplus", "telegram"];

/**
 * 取今日(按上海时区 0 点起)按渠道分组的推送统计。
 * 0 推送的渠道也返回(total=0),admin 能看到"今天这个渠道没动"。
 */
export async function getTodayChannelStats(
  todayStartUTC: Date
): Promise<ChannelStat[]> {
  // groupBy 不能 join User 拿 channel(ReminderSent.channel 不存在,要走 user.channel)
  // 退一步: 查今日所有 reminder + user,然后 JS 里 group
  const reminders = await prisma.reminderSent.findMany({
    where: { sentAt: { gte: todayStartUTC } },
    select: {
      status: true,
      user: { select: { channel: true } },
    },
  });

  const map = new Map<Channel, ChannelStat>();
  for (const ch of ALL_CHANNELS) {
    map.set(ch, { channel: ch, total: 0, success: 0, failed: 0 });
  }
  for (const r of reminders) {
    const stat = map.get(r.user.channel);
    if (!stat) continue; // 防御:未知 channel 跳过
    stat.total++;
    if (r.status === "success") stat.success++;
    else if (r.status === "failed") stat.failed++;
  }
  return ALL_CHANNELS.map((ch) => map.get(ch)!);
}

/**
 * 取最近 N 天失败次数最多的 sim 列表。
 *
 * 业务用例: /admin 仪表盘"7 日失败 top 3 sim"小卡,
 * admin 一眼看出哪些号码在反复失败(可能:key 配错 / 渠道限流 / 号码被弃用)。
 *
 * 实现: groupBy simId + where status=failed + sentAt 区间,
 *       按 failed 倒序取前 N,再 join sim 拿 phoneNumber。
 */
export interface TopFailingSim {
  simId: number;
  phoneNumber: string;
  failedCount: number;
}

export async function getTopFailingSims(
  days: number,
  limit: number
): Promise<TopFailingSim[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  // groupBy + Prisma 7: 可以直接用,但不能 join sim 拿 phoneNumber
  // 先 groupBy 拿 simId 列表,再单独 findMany sim
  const grouped = await prisma.reminderSent.groupBy({
    by: ["simId"],
    where: { status: "failed", sentAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { simId: "desc" } },
    take: limit,
  });
  if (grouped.length === 0) return [];

  const simIds = grouped.map((g) => g.simId);
  const sims = await prisma.sim.findMany({
    where: { id: { in: simIds } },
    select: { id: true, phoneNumber: true },
  });
  const phoneMap = new Map(sims.map((s) => [s.id, s.phoneNumber]));

  return grouped
    .map((g) => ({
      simId: g.simId,
      phoneNumber: phoneMap.get(g.simId) ?? "(已删除)",
      failedCount: g._count._all,
    }))
    .filter((s) => s.phoneNumber !== "(已删除)"); // 防御性过滤
}

/**
 * Round 149: 取最近 30 天每日推送数(从今天倒数 30 天)
 *
 * 算法: 复用 getTopFailingSims 的 groupBy 思路,但按 day 分组。
 * 简化: 用 raw query 太重,改成连续 30 次 count() 并行(已经验证 7 天可行)。
 */
export interface DailySend {
  /** 距今天的天数(0 = 今天, 29 = 29 天前) */
  offset: number;
  /** 当天 0 点 UTC 的 Date 对象(用 +12h 防时区抖动) */
  date: Date;
  /** 当天发送数 */
  count: number;
}

export async function getLast30DaysSends(): Promise<DailySend[]> {
  const todayStartUTC = new Date();
  todayStartUTC.setUTCHours(0, 0, 0, 0);

  const days = await Promise.all(
    Array.from({ length: 30 }, async (_, i) => {
      const offset = 29 - i;
      const dayStart = new Date(todayStartUTC.getTime() - offset * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = await prisma.reminderSent.count({
        where: { sentAt: { gte: dayStart, lt: dayEnd } },
      });
      return {
        offset,
        // +12h 防止边缘时区把日期推到前一天/后一天
        date: new Date(dayStart.getTime() + 12 * 60 * 60 * 1000),
        count,
      };
    })
  );
  return days;
}

/**
 * Round 151: 取"提醒窗口内"的 sim 列表(170-180 天)
 *
 * 业务用例: /admin 仪表盘"提醒窗口内 sim 列表"卡,
 * admin 不只看数字(几个 sim 在窗口),还能看到具体哪些 sim。
 *
 * 算法: 取所有 active sim,JS 里算 dayOffset 过滤 170-180 区间,
 * 跟 dashboard 主流程的 inWindowSimCount 算法保持一致。
 */
export interface InWindowSim {
  simId: number;
  phoneNumber: string;
  dayOffset: number;
  daysLeft: number; // 距保号截止 (180 - dayOffset)
}

export async function getInWindowSims(limit: number = 10): Promise<InWindowSim[]> {
  const sims = await prisma.sim.findMany({
    where: { status: "active" },
    select: { id: true, phoneNumber: true, activatedAt: true, lastPortedAt: true },
  });
  const now = new Date();
  const inWindow = sims
    .map((s) => {
      const baseline = s.lastPortedAt ?? s.activatedAt;
      const dayOffset = dayOffsetFromBaseline(baseline, now);
      return {
        simId: s.id,
        phoneNumber: s.phoneNumber,
        dayOffset,
        daysLeft: 180 - dayOffset,
      };
    })
    .filter((s) => s.dayOffset >= 170 && s.dayOffset <= 180)
    .sort((a, b) => a.daysLeft - b.daysLeft) // 最紧急的(剩最少天)排前
    .slice(0, limit);
  return inWindow;
}

// 内部依赖: 导入 dayOffsetFromBaseline
import { dayOffsetFromBaseline } from "./bucket";

/**
 * Round 152: sim 状态统计(总览,不受日期区间限制)
 *
 * 业务用例: /admin 仪表盘"sim 状态"卡,admin 一眼看到
 * "总数 50, 活跃 45, 暂停 5" 的整体健康度。
 */
export interface SimStatusBreakdown {
  total: number;
  active: number;
  paused: number;
  bound: number; // 绑定了 user 的 sim
  unbound: number; // 未绑定 user
}

export async function getSimStatusBreakdown(): Promise<SimStatusBreakdown> {
  const [total, active, paused, bound] = await Promise.all([
    prisma.sim.count(),
    prisma.sim.count({ where: { status: "active" } }),
    prisma.sim.count({ where: { status: "paused" } }),
    prisma.sim.count({ where: { user: { isNot: null } } }),
  ]);
  return {
    total,
    active,
    paused,
    bound,
    unbound: total - bound,
  };
}

/**
 * Round 153: 取今日按小时(0-23)的推送数
 *
 * 业务用例: /me "今日已推" widget 加按小时分布 mini chart,
 * 让用户看到'今天系统什么时候推过'(e.g. 早上 9 点、下午 2 点、晚上 7 点)。
 */
export interface HourlySend {
  /** 0-23 时 */
  hour: number;
  /** 该小时内的推送数 */
  count: number;
}

export async function getTodayHourlySends(
  simId: number
): Promise<HourlySend[]> {
  // 取今日所有 reminder,JS 里 group by hour (用上海时区)
  const todayStartUTC = new Date();
  todayStartUTC.setUTCHours(0, 0, 0, 0);

  const reminders = await prisma.reminderSent.findMany({
    where: { simId, sentAt: { gte: todayStartUTC } },
    select: { sentAt: true },
  });

  // 初始化 24 个 hour
  const hourly: HourlySend[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
  }));

  for (const r of reminders) {
    // 用上海时区 hour (sentAt 是 UTC, 手动 +8 算上海)
    // 简化: 用 getUTCHours + 8 mod 24
    const shanghaiHour = (r.sentAt.getUTCHours() + 8) % 24;
    hourly[shanghaiHour].count++;
  }

  return hourly;
}

/**
 * Round 156: 取最近 90 天每日推送数
 *
 * 跟 getLast30DaysSends 思路相同,只是窗口拉长到 90 天。
 * 给 admin 仪表盘 mini bar 用,展示更长期趋势。
 */
export async function getLast90DaysSends(): Promise<DailySend[]> {
  const todayStartUTC = new Date();
  todayStartUTC.setUTCHours(0, 0, 0, 0);

  const days = await Promise.all(
    Array.from({ length: 90 }, async (_, i) => {
      const offset = 89 - i;
      const dayStart = new Date(todayStartUTC.getTime() - offset * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = await prisma.reminderSent.count({
        where: { sentAt: { gte: dayStart, lt: dayEnd } },
      });
      return {
        offset,
        date: new Date(dayStart.getTime() + 12 * 60 * 60 * 1000),
        count,
      };
    })
  );
  return days;
}
