import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserId, getCurrentUserSessionId } from "@/lib/session";
import { sendPush } from "@/lib/channels";
import { updateCurrentUserSimChannel } from "@/lib/user-sim-writes";

const BodySchema = z.object({
  channel: z.enum(["serverchan", "bark", "pushplus", "telegram"]),
  channelKey: z.string().min(1, "请填写渠道 Key"),
  /** 客户端先用 test-push 验证过,true 才允许保存 */
  verified: z.boolean().optional().default(false),
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
 * 安全:要求前端先调 /api/me/channel/test-push 验证 key,
 * 避免保存错的 key 导致后续推送失败。
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

  const { channel, channelKey, verified, simId: requestedSimId } = parsed.data;

  // 设置页已经完成测试推送时，归属校验与写入合并为一次查询。
  if (verified && requestedSimId !== undefined) {
    const outcome = await updateCurrentUserSimChannel(
      sessionId,
      requestedSimId,
      channel,
      channelKey
    );
    if (!outcome.authenticated) {
      return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
    }
    if (outcome.sim) {
      return NextResponse.json({ ok: true, simId: outcome.sim.id });
    }
    if (!outcome.hasSims) {
      return NextResponse.json(
        { ok: false, error: "您还没绑定任何 SIM 卡" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "无权修改该 SIM 卡的渠道" },
      { status: 403 }
    );
  }

  // 兼容旧客户端不传 simId，以及未先测试推送的请求。
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
    if (requestedSimId !== undefined) {
      const firstOwnedSim = await prisma.sim.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (firstOwnedSim) {
        return NextResponse.json(
          { ok: false, error: "无权修改该 SIM 卡的渠道" },
          { status: 403 }
        );
      }
    }
    return NextResponse.json(
      { ok: false, error: "您还没绑定任何 SIM 卡" },
      { status: 400 }
    );
  }

  // 没验证过 key → 服务端再验证一次
  if (!verified) {
    const result = await sendPush(
      channel,
      channelKey,
      "Giffgaff 保号提醒 - 渠道验证",
      "正在保存您的通知渠道配置。如果收到此消息,说明配置正确。"
    );
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: `渠道验证失败: ${result.errorMessage}` },
        { status: 502 }
      );
    }
  }

  await prisma.sim.update({
    where: { id: targetSim.id },
    data: { channel, channelKey },
  });

  return NextResponse.json({ ok: true, simId: targetSim.id });
}
