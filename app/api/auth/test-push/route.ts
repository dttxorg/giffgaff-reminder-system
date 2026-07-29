import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPush } from "@/lib/channels";
import { getCurrentUserId } from "@/lib/session";
import {
  enforceRateLimits,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

const BodySchema = z.object({
  channel: z.enum(["serverchan", "bark", "pushplus", "telegram"]),
  channelKey: z.string().min(1).max(2048),
});

/**
 * POST /api/auth/test-push
 * 测试推送：填好渠道 key 后立即发一条测试消息，不消耗验证码、不写库
 * 限流：同一 IP 30 秒内只能调 1 次
 */
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const ip = getClientIp(req);
  const limited = await enforceRateLimits([
    { scope: "test-push-ip", identifiers: [ip], limit: 5, windowMs: 10 * 60 * 1000 },
    { scope: "test-push-user", identifiers: [String(userId)], limit: 8, windowMs: 10 * 60 * 1000 },
  ]);
  if (!limited.allowed) return rateLimitResponse(limited);

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

  const { channel, channelKey } = parsed.data;
  const channelName =
    channel === "serverchan"
      ? "Sever酱"
      : channel === "bark"
      ? "Bark"
      : channel === "pushplus"
      ? "pushplus"
      : "Telegram";
  const result = await sendPush(
    channel,
    channelKey,
    "SIM 保号提醒 - 测试",
    `✅ 这是一条测试消息。\n\n如果您看到这条消息,说明您的 ${channelName} 配置成功!\n\n接下来系统会按每个号码的运营商预设或自定义日期自动推送保号提醒。`
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: `${channelName} 推送失败，请检查配置` },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
