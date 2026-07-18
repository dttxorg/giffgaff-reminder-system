// 提醒引擎：根据当前时间扫描所有 sim，发送提醒
import { prisma } from "./db";
import { bucketForDay, dayOffsetFromBaseline, shanghaiParts } from "./bucket";
import { sendPush, type ChannelType, type SendResult } from "./channels";
import { DEFAULT_TEMPLATE, portUrl, renderTemplate } from "./template";
import { ensureSimPortToken } from "./port-token-db";
import {
  buildAccountReminderMessage,
  MULTI_SIM_AGGREGATE_THRESHOLD,
} from "./account-reminder";

export interface ReminderRunDetail {
  simId: number;
  dayOffset: number;
  bucket: number;
  action: "sent" | "skipped" | "failed";
  error?: string;
  userId?: number;
  aggregateSimIds?: number[];
}

export interface ReminderRunResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  details: ReminderRunDetail[];
}

interface RunOptions {
  baseUrl: string;
  now?: Date;
  /** 强制 dry-run：不写库、不推送 */
  dryRun?: boolean;
}

interface ScanSim {
  id: number;
  userId: number | null;
  phoneNumber: string;
  activatedAt: Date;
  lastPortedAt: Date | null;
  portToken: string | null;
  channel: ChannelType;
  channelKey: string;
}

interface ReminderCandidate {
  sim: ScanSim;
  dayOffset: number;
  bucket: number;
}

function shanghaiDayIdentity(now: Date): {
  dayKey: string;
  start: Date;
  end: Date;
} {
  const parts = shanghaiParts(now);
  const dayKey = [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
  const start = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day) - 8 * 60 * 60 * 1000
  );
  return {
    dayKey,
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

function aggregateDetail(
  candidates: ReminderCandidate[],
  action: ReminderRunDetail["action"],
  error?: string
): ReminderRunDetail {
  const representative = [...candidates].sort(
    (a, b) => b.dayOffset - a.dayOffset || a.sim.id - b.sim.id
  )[0];
  return {
    simId: representative.sim.id,
    userId: representative.sim.userId ?? undefined,
    dayOffset: representative.dayOffset,
    bucket: representative.bucket,
    action,
    error,
    aggregateSimIds: candidates.map((candidate) => candidate.sim.id),
  };
}

/**
 * 执行一次提醒扫描。
 *
 * - 1–3 张活跃号码：保持逐号码、逐 bucket 提醒。
 * - 4 张及以上活跃号码：按账号每天最多一条汇总提醒，跳转账号后台处理。
 */
export async function runReminderScan(
  opts: RunOptions
): Promise<ReminderRunResult> {
  const now = opts.now ?? new Date();
  const hourOfDay = shanghaiParts(now).hour;
  const day = shanghaiDayIdentity(now);
  const result: ReminderRunResult = {
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  const [sims, setting] = await Promise.all([
    prisma.sim.findMany({
      where: { status: "active", userId: { not: null } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        userId: true,
        phoneNumber: true,
        activatedAt: true,
        lastPortedAt: true,
        portToken: true,
        channel: true,
        channelKey: true,
      },
    }),
    prisma.setting.findUnique({ where: { key: "reminder_template" } }),
  ]);
  const scanSims = sims as ScanSim[];
  const template = setting?.value || DEFAULT_TEMPLATE;
  result.processed = scanSims.length;

  const simsByUser = new Map<number, ScanSim[]>();
  for (const sim of scanSims) {
    if (sim.userId === null) continue;
    const owned = simsByUser.get(sim.userId) ?? [];
    owned.push(sim);
    simsByUser.set(sim.userId, owned);
  }

  const candidates: ReminderCandidate[] = scanSims.flatMap((sim) => {
    const baseline = sim.lastPortedAt ?? sim.activatedAt;
    const dayOffset = dayOffsetFromBaseline(baseline, now);
    const plan = bucketForDay(dayOffset, hourOfDay);
    return plan ? [{ sim, dayOffset, bucket: plan.bucket }] : [];
  });

  const directCandidates: ReminderCandidate[] = [];
  const aggregateGroups = new Map<number, ReminderCandidate[]>();
  for (const candidate of candidates) {
    const userId = candidate.sim.userId!;
    if (
      (simsByUser.get(userId)?.length ?? 0) >
      MULTI_SIM_AGGREGATE_THRESHOLD
    ) {
      const group = aggregateGroups.get(userId) ?? [];
      group.push(candidate);
      aggregateGroups.set(userId, group);
    } else {
      directCandidates.push(candidate);
    }
  }

  const aggregateUserIds = Array.from(aggregateGroups.keys());
  const idempotencyFilters = [
    ...directCandidates.map(({ sim, dayOffset, bucket }) => ({
      simId: sim.id,
      dayOffset,
      bucket,
    })),
    ...(aggregateUserIds.length
      ? [
          {
            userId: { in: aggregateUserIds },
            sentAt: { gte: day.start, lt: day.end },
          },
        ]
      : []),
  ];
  const existingRows = idempotencyFilters.length
    ? await prisma.reminderSent.findMany({
        where: { OR: idempotencyFilters },
        select: {
          simId: true,
          userId: true,
          dayOffset: true,
          bucket: true,
          sentAt: true,
          aggregateDay: true,
        },
      })
    : [];
  const existingKeys = new Set(
    existingRows.map((row) => `${row.simId}:${row.dayOffset}:${row.bucket}`)
  );
  const usersAlreadyNotifiedToday = new Set(
    existingRows
      .filter(
        (row) =>
          aggregateGroups.has(row.userId) &&
          row.sentAt >= day.start &&
          row.sentAt < day.end
      )
      .map((row) => row.userId)
  );

  // 大账号先按用户聚合；唯一索引在真正推送前完成占位，避免并发 cron 重复发送。
  for (const [userId, group] of aggregateGroups) {
    if (usersAlreadyNotifiedToday.has(userId)) {
      result.skipped += group.length;
      result.details.push(aggregateDetail(group, "skipped"));
      continue;
    }

    const userSims = simsByUser.get(userId) ?? [];
    const notificationSim =
      userSims.find((sim) => sim.channelKey.trim() !== "") ?? userSims[0];
    const representative = [...group].sort(
      (a, b) => b.dayOffset - a.dayOffset || a.sim.id - b.sim.id
    )[0];
    const aggregateSimIds = group.map((candidate) => candidate.sim.id);

    if (opts.dryRun) {
      result.sent++;
      result.details.push(aggregateDetail(group, "sent"));
      continue;
    }

    let reservation: { id: number };
    try {
      reservation = await prisma.reminderSent.create({
        data: {
          simId: notificationSim.id,
          userId,
          dayOffset: representative.dayOffset,
          bucket: representative.bucket,
          channel: notificationSim.channel,
          channelKey: "",
          status: "failed",
          errorMessage: "汇总提醒发送处理中",
          aggregateDay: day.dayKey,
          aggregateSimCount: group.length,
        },
        select: { id: true },
      });
    } catch {
      result.skipped += group.length;
      result.details.push(
        aggregateDetail(group, "skipped", "汇总提醒已由其他任务处理")
      );
      continue;
    }

    const message = buildAccountReminderMessage(
      group.map(({ sim, dayOffset }) => ({
        id: sim.id,
        phoneNumber: sim.phoneNumber,
        dayOffset,
      })),
      opts.baseUrl
    );
    const sendResult: SendResult = notificationSim.channelKey.trim()
      ? await sendPush(
          notificationSim.channel,
          notificationSim.channelKey,
          message.title,
          message.body
        )
      : { ok: false, errorMessage: "账号主通知渠道未配置" };

    try {
      await prisma.reminderSent.update({
        where: { id: reservation.id },
        data: {
          status: sendResult.ok ? "success" : "failed",
          errorMessage: sendResult.ok
            ? null
            : sendResult.errorMessage || "未知错误",
          sentAt: now,
        },
      });
    } catch {
      result.failed++;
      result.details.push(
        aggregateDetail(group, "failed", "汇总提醒日志更新失败")
      );
      continue;
    }

    if (sendResult.ok) {
      result.sent++;
      result.details.push({
        ...aggregateDetail(group, "sent"),
        aggregateSimIds,
      });
    } else {
      result.failed++;
      result.details.push(
        aggregateDetail(group, "failed", sendResult.errorMessage)
      );
    }
  }

  // 小账号保持原来的逐号码提醒策略。
  for (const { sim, dayOffset, bucket } of directCandidates) {
    if (existingKeys.has(`${sim.id}:${dayOffset}:${bucket}`)) {
      result.skipped++;
      result.details.push({ simId: sim.id, dayOffset, bucket, action: "skipped" });
      continue;
    }

    let url: string;
    if (sim.portToken) {
      url = portUrl(opts.baseUrl, sim.portToken);
    } else {
      const token = await ensureSimPortToken(sim.id, sim.portToken);
      if (!token) {
        result.failed++;
        result.details.push({
          simId: sim.id,
          dayOffset,
          bucket,
          action: "failed",
          error: "公开 token 生成失败",
        });
        continue;
      }
      url = portUrl(opts.baseUrl, token);
    }
    const body = renderTemplate(template, {
      phone: `**** ${sim.phoneNumber.slice(-4)}`,
      days: dayOffset,
      port_url: url,
    });
    const title = `Giffgaff 保号提醒 (${dayOffset}天)`;

    if (opts.dryRun) {
      result.sent++;
      result.details.push({ simId: sim.id, dayOffset, bucket, action: "sent" });
      continue;
    }

    const channel = sim.channel as ChannelType;
    const sendResult = await sendPush(channel, sim.channelKey, title, body);
    try {
      await prisma.reminderSent.create({
        data: {
          simId: sim.id,
          userId: sim.userId!,
          dayOffset,
          bucket,
          channel,
          channelKey: "",
          status: sendResult.ok ? "success" : "failed",
          errorMessage: sendResult.errorMessage,
        },
      });
    } catch {
      result.skipped++;
      result.details.push({
        simId: sim.id,
        dayOffset,
        bucket,
        action: "skipped",
        error: "提醒已由其他任务处理",
      });
      continue;
    }

    if (sendResult.ok) {
      result.sent++;
      result.details.push({ simId: sim.id, dayOffset, bucket, action: "sent" });
    } else {
      result.failed++;
      result.details.push({
        simId: sim.id,
        dayOffset,
        bucket,
        action: "failed",
        error: sendResult.errorMessage,
      });
    }
  }

  return result;
}
