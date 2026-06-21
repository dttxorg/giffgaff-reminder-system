// 提醒引擎：根据当前时间扫描所有 sim，发送提醒
import { prisma } from "./db";
import { bucketForDay, dayOffsetFromBaseline } from "./bucket";
import { sendPush, type ChannelType } from "./channels";
import { DEFAULT_TEMPLATE, portUrl, renderTemplate } from "./template";

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
 */
export async function runReminderScan(opts: RunOptions): Promise<ReminderRunResult> {
  const now = opts.now ?? new Date();
  const hourOfDay = now.getUTCHours();
  const result: ReminderRunResult = { processed: 0, sent: 0, skipped: 0, failed: 0, details: [] };

  // 1. 取所有 active sim + 绑定 user
  const sims = await prisma.sim.findMany({
    where: { status: "active", user: { isNot: null } },
    include: { user: true },
  });

  // 2. 取提醒模板
  const setting = await prisma.setting.findUnique({ where: { key: "reminder_template" } });
  const template = setting?.value || DEFAULT_TEMPLATE;

  for (const sim of sims) {
    if (!sim.user) continue;
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

    // 6. 渲染文案
    const url = portUrl(opts.baseUrl, sim.id);
    const body = renderTemplate(template, {
      phone: sim.phoneNumber,
      days: dayOffset,
      port_url: url,
    });
    const title = `Giffgaff 保号提醒 (${dayOffset}天)`;

    if (opts.dryRun) {
      result.sent++;
      result.details.push({ simId: sim.id, dayOffset, bucket: plan.bucket, action: "sent" });
      continue;
    }

    // 7. 推送
    const channel = sim.user.channel as ChannelType;
    const sendResult = await sendPush(channel, sim.user.channelKey, title, body);

    // 8. 写日志（无论成功失败）
    try {
      await prisma.reminderSent.create({
        data: {
          simId: sim.id,
          userId: sim.user.id,
          dayOffset,
          bucket: plan.bucket,
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
