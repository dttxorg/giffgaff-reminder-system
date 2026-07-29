import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { sendPush } from "@/lib/channels";
import { DEFAULT_TEMPLATE, portUrl, renderTemplate } from "@/lib/template";
import { ensureSimPortToken } from "@/lib/port-token-db";
import { dayOffsetFromBaseline } from "@/lib/bucket";
import { parsePositiveIntParam } from "@/lib/route-params";
import {
  enforceRateLimits,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { getPublicBaseUrl } from "@/lib/public-base-url";
import { buildAccountReminderResendMessage } from "@/lib/account-reminder";
import { carrierPolicy } from "@/lib/carrier";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/reminders/[id]/resend
 * 手动重发某条失败(也可重发成功)的提醒。
 *
 * 重发使用 SIM 当前渠道；历史记录不保留可重放的推送密钥。
 *
 * - 鉴权: 管理员 session
 * - 行为: 用 reminder 当时的 dayOffset 渲染模板,推送;更新原 log
 */
export async function POST(req: Request, ctx: RouteContext) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const limited = await enforceRateLimits([
    {
      scope: "admin-reminder-resend-ip",
      identifiers: [getClientIp(req)],
      limit: 20,
      windowMs: 60 * 60 * 1000,
    },
  ]);
  if (!limited.allowed) return rateLimitResponse(limited);
  const { id } = await ctx.params;
  const reminderId = parsePositiveIntParam(id);
  if (reminderId === null) {
    return NextResponse.json({ ok: false, error: "id 无效" }, { status: 400 });
  }

  // 提醒快照与模板互不依赖，并行读取以缩短手动重发的等待路径。
  const [reminder, setting] = await Promise.all([
    prisma.reminderSent.findUnique({
      where: { id: reminderId },
      include: { sim: true },
    }),
    prisma.setting.findUnique({ where: { key: "reminder_template" } }),
  ]);
  if (!reminder) {
    return NextResponse.json({ ok: false, error: "记录不存在" }, { status: 404 });
  }

  if (!reminder.sim.channelKey) {
    return NextResponse.json(
      { ok: false, error: "该 SIM 尚未配置推送渠道" },
      { status: 400 }
    );
  }

  const baseUrl = getPublicBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: "PUBLIC_BASE_URL 配置无效" },
      { status: 503 }
    );
  }
  let title: string;
  let body: string;
  if (reminder.aggregateDay) {
    const message = buildAccountReminderResendMessage(
      reminder.aggregateSimCount,
      reminder.dayOffset,
      baseUrl
    );
    title = message.title;
    body = message.body;
  } else {
    const baseline = reminder.sim.lastPortedAt ?? reminder.sim.activatedAt;
    const days = dayOffsetFromBaseline(baseline);
    let url: string;
    if (reminder.sim.portToken) {
      url = portUrl(baseUrl, reminder.sim.portToken);
    } else {
      // 已知当前值为空，避免 ensureSimPortToken 再查一次 SIM。
      const token = await ensureSimPortToken(
        reminder.sim.id,
        reminder.sim.portToken
      );
      if (!token) {
        return NextResponse.json(
          { ok: false, error: "公开链接生成失败" },
          { status: 503 }
        );
      }
      url = portUrl(baseUrl, token);
    }
    const template = setting?.value || DEFAULT_TEMPLATE;
    const carrierLabel = carrierPolicy(reminder.sim.carrier).label;
    title = `${carrierLabel} 保号提醒`;
    body = renderTemplate(template, {
      phone: reminder.sim.phoneNumber,
      days,
      port_url: url,
      carrier: carrierLabel,
    });
  }

  const result = await sendPush(
    reminder.sim.channel,
    reminder.sim.channelKey,
    title,
    body
  );
  await prisma.reminderSent.update({
    where: { id: reminderId },
    data: {
      status: result.ok ? "success" : "failed",
      errorMessage: result.ok ? null : result.errorMessage || "未知错误",
      sentAt: new Date(),
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.errorMessage || "推送失败" },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
