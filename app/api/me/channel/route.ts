import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserId, getCurrentUserSessionId } from "@/lib/session";
import { sendPush } from "@/lib/channels";
import { updateCurrentUserSimChannel } from "@/lib/user-sim-writes";
import {
  enforceRateLimits,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

const BodySchema = z.object({
  channel: z.enum(["serverchan", "bark", "pushplus", "telegram"]),
  channelKey: z.string().min(1, "请填写渠道 Key").max(2048),
  /** 要更新哪张 sim 的渠道(多卡场景必传) */
  simId: z.number().int().positive().optional(),
});

/**
 * POST /api/me/channel
 * 更新某张 sim 的推送渠道(每张 sim 独立)
 *
 * 1:N 模型下,每张 sim 有自己的 channel/channelKey。
 * 账号下可以统一用同一渠道(每张都设相同的),
 * 也可以各 sim 用不同渠道(分别设)。
 *
   * 安全:服务端每次保存前都独立验证 key，不信任客户端的“已验证”状态。
 */
export async function POST(req: Request) {
  const sessionId = await getCurrentUserSessionId();
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体格式错误" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "参数错误" }, { status: 400 });
  }

  const { channel, channelKey, simId: requestedSimId } = parsed.data;

  // 在任何外部推送发生前先确认账号和 SIM 归属，防止越权请求被当成开放中继。
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const targetSim = await prisma.sim.findFirst({
    where:
      requestedSimId === undefined
        ? { userId }
        : { id: requestedSimId, userId },
    orderBy: requestedSimId === undefined ? { id: "asc" } : undefined,
    select: { id: true },
  });
  if (!targetSim) {
    const hasOwnedSim = await prisma.sim.findFirst({
      where: { userId },
      select: { id: true },
    });
    return NextResponse.json(
      {
        ok: false,
        error: hasOwnedSim ? "无权修改该 SIM 卡的渠道" : "您还没绑定任何 SIM 卡",
      },
      { status: hasOwnedSim ? 403 : 400 }
    );
  }

  const limited = await enforceRateLimits([
    {
      scope: "save-channel-session",
      identifiers: [sessionId],
      limit: 10,
      windowMs: 10 * 60 * 1000,
    },
    {
      scope: "save-channel-ip",
      identifiers: [getClientIp(req)],
      limit: 20,
      windowMs: 10 * 60 * 1000,
    },
  ]);
  if (!limited.allowed) return rateLimitResponse(limited);

  const verification = await sendPush(
    channel,
    channelKey,
    "Giffgaff 保号提醒 - 渠道验证",
    "正在保存您的通知渠道配置。如果收到此消息,说明配置正确。"
  );
  if (!verification.ok) {
    return NextResponse.json(
      { ok: false, error: "渠道验证失败，请检查地址或密钥" },
      { status: 502 }
    );
  }

  const outcome = await updateCurrentUserSimChannel(
    sessionId,
    targetSim.id,
    channel,
    channelKey
  );
  if (!outcome.authenticated) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  if (!outcome.sim) {
    return NextResponse.json(
      { ok: false, error: "SIM 卡归属已发生变化，请刷新后重试" },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, simId: outcome.sim.id });
}
