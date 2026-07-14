import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { sendPush } from "@/lib/channels";
import { DEFAULT_TEMPLATE, portUrl, renderTemplate } from "@/lib/template";
import { ensureSimPortToken } from "@/lib/port-token-db";
import { dayOffsetFromBaseline } from "@/lib/bucket";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/reminders/[id]/resend
 * 手动重发某条失败(也可重发成功)的提醒。
 *
 * 渠道使用 reminder 当时的快照(channel/channelKey)— 即使 sim 后来改了渠道,
 * 重发也保持原渠道(便于复现问题)。也可用 sim 当前的渠道重发,目前用快照。
 *
 * - 鉴权: 管理员 session
 * - 行为: 用 reminder 当时的 dayOffset 渲染模板,推送;更新原 log
 */
export async function POST(_req: Request, ctx: RouteContext) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const reminderId = parseInt(id, 10);
  if (!Number.isFinite(reminderId)) {
    return NextResponse.json({ ok: false, error: "id 无效" }, { status: 400 });
  }

  const reminder = await prisma.reminderSent.findUnique({
    where: { id: reminderId },
    include: { sim: true },
  });
  if (!reminder) {
    return NextResponse.json({ ok: false, error: "记录不存在" }, { status: 404 });
  }

  // 渠道使用 reminder 当时的快照(便于复现当时的推送问题)
  if (!reminder.channelKey) {
    return NextResponse.json(
      { ok: false, error: "该提醒快照无渠道 key(可能是早期数据)" },
      { status: 400 }
    );
  }

  const baseline = reminder.sim.lastPortedAt ?? reminder.sim.activatedAt;
  const days = dayOffsetFromBaseline(baseline);
  const baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
  let url: string;
  if (reminder.sim.portToken) {
    url = portUrl(baseUrl, reminder.sim.portToken);
  } else {
    const token = await ensureSimPortToken(reminder.sim.id);
    url = token ? portUrl(baseUrl, token) : portUrl(baseUrl, reminder.sim.id);
  }
  const setting = await prisma.setting.findUnique({ where: { key: "reminder_template" } });
  const template = setting?.value || DEFAULT_TEMPLATE;
  const title = "Giffgaff 保号提醒";
  const body = renderTemplate(template, {
    phone: reminder.sim.phoneNumber,
    days,
    port_url: url,
  });

  const result = await sendPush(reminder.channel, reminder.channelKey, title, body);
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
