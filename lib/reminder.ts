// 提醒引擎：根据当前时间扫描所有 sim，发送提醒
import { prisma } from "./db";
import { bucketForDay, dayOffsetFromBaseline, shanghaiParts } from "./bucket";
import { sendPush, type ChannelType } from "./channels";
import { DEFAULT_TEMPLATE, portUrl, renderTemplate } from "./template";
import { ensureSimPortToken } from "./port-token-db";

export interface ReminderRunResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{ simId: number; dayOffset: number; bucket: number; action: "sent" | "skipped" | "failed"; error?: string }>;
}

interface RunOptions {
  baseUrl: string;
  now?: Date;
  /** 强制 dry-run：不写库、不推送 */
  dryRun?: boolean;
}

/**
 * 执行一次提醒扫描
 *
 * 渠道从每张 sim 自己的 channel/channelKey 拿(1:N 模型)
 * ReminderSent 写时快照 channel/channelKey,即使后来改了也不影响历史日志
 */
export async function runReminderScan(opts: RunOptions): Promise<ReminderRunResult> {
  const now = opts.now ?? new Date();
  // 用北京时间算小时,bucket 窗口才跟用户预期对齐
  // (Vercel serverless 在 UTC,getUTCHours 会让 0-8 点的 sim 全部错位)
  const hourOfDay = shanghaiParts(now).hour;
  const result: ReminderRunResult = { processed: 0, sent: 0, skipped: 0, failed: 0, details: [] };

  // 1. 取所有 active sim(必须挂到 user,user 至少要登录过才有效)
  // 渠道是 sim 自己的,不需要 join user.channel
  const sims = await prisma.sim.findMany({
    where: { status: "active", userId: { not: null } },
    include: { user: true },
  });

  // 2. 取提醒模板
  const setting = await prisma.setting.findUnique({ where: { key: "reminder_template" } });
  const template = setting?.value || DEFAULT_TEMPLATE;

  for (const sim of sims) {
    result.processed++;

    // 3. 计算 dayOffset
    const baseline = sim.lastPortedAt ?? sim.activatedAt;
    const dayOffset = dayOffsetFromBaseline(baseline, now);

    // 4. 计算 bucket
    const plan = bucketForDay(dayOffset, hourOfDay);
    if (!plan) continue;

    // 5. 幂等检查
    const existing = await prisma.reminderSent.findUnique({
      where: { simId_dayOffset_bucket: { simId: sim.id, dayOffset, bucket: plan.bucket } },
    });
    if (existing) {
      result.skipped++;
      result.details.push({ simId: sim.id, dayOffset, bucket: plan.bucket, action: "skipped" });
      continue;
    }

    // 6. 渲染文案（隐私：sim 号码只显示后 4 位;URL 用不可枚举 token）
    // 老 sim 没有 portToken 时 lazy-backfill(确保下次提醒也是 token URL)
    let url: string;
    if (sim.portToken) {
      url = portUrl(opts.baseUrl, sim.portToken);
    } else {
      const token = await ensureSimPortToken(sim.id);
      url = token ? portUrl(opts.baseUrl, token) : portUrl(opts.baseUrl, sim.id);
    }
    const phoneDisplay = `**** ${sim.phoneNumber.slice(-4)}`;
    const body = renderTemplate(template, {
      phone: phoneDisplay,
      days: dayOffset,
      port_url: url,
    });
    const title = `Giffgaff 保号提醒 (${dayOffset}天)`;

    if (opts.dryRun) {
      result.sent++;
      result.details.push({ simId: sim.id, dayOffset, bucket: plan.bucket, action: "sent" });
      continue;
    }

    // 7. 推送 — 渠道从 sim 自己拿
    const channel = sim.channel as ChannelType;
    const sendResult = await sendPush(channel, sim.channelKey, title, body);

    // 8. 写日志（无论成功失败,带 channel 快照）
    try {
      await prisma.reminderSent.create({
        data: {
          simId: sim.id,
          userId: sim.userId!,
          dayOffset,
          bucket: plan.bucket,
          channel,
          channelKey: sim.channelKey,
          status: sendResult.ok ? "success" : "failed",
          errorMessage: sendResult.errorMessage,
        },
      });
    } catch (e) {
      // 唯一约束冲突说明并发时其他进程已写 → skip
      result.skipped++;
      result.details.push({
        simId: sim.id,
        dayOffset,
        bucket: plan.bucket,
        action: "skipped",
        error: e instanceof Error ? e.message : String(e),
      });
      continue;
    }

    if (sendResult.ok) {
      result.sent++;
      result.details.push({ simId: sim.id, dayOffset, bucket: plan.bucket, action: "sent" });
    } else {
      result.failed++;
      result.details.push({
        simId: sim.id,
        dayOffset,
        bucket: plan.bucket,
        action: "failed",
        error: sendResult.errorMessage,
      });
    }
  }

  return result;
}
