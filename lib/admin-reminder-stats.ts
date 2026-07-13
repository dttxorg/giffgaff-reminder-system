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
