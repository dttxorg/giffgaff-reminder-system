import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPush } from "@/lib/channels";

const BodySchema = z.object({
  channel: z.enum(["serverchan", "bark"]),
  channelKey: z.string().min(1),
});

// 简单 IP 限流：每个 IP 30 秒最多 1 次
const lastCallMap = new Map<string, number>();
const RATE_LIMIT_MS = 30_000;
const MAX_MAP_SIZE = 1000; // 防止内存泄漏

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/**
 * POST /api/auth/test-push
 * 测试推送：填好渠道 key 后立即发一条测试消息，不消耗验证码、不写库
 * 限流：同一 IP 30 秒内只能调 1 次
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const now = Date.now();
  const last = lastCallMap.get(ip) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
    return NextResponse.json(
      { ok: false, error: `请 ${waitSec} 秒后再试` },
      { status: 429 }
    );
  }
  // 防止内存膨胀
  if (lastCallMap.size > MAX_MAP_SIZE) {
    const cutoff = now - RATE_LIMIT_MS * 10;
    for (const [k, v] of lastCallMap) {
      if (v < cutoff) lastCallMap.delete(k);
    }
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

  const { channel, channelKey } = parsed.data;
  const channelName = channel === "serverchan" ? "Sever酱" : "Bark";
  const result = await sendPush(
    channel,
    channelKey,
    "Giffgaff 报号提醒 - 测试",
    `✅ 这是一条测试消息。\n\n如果您看到这条消息,说明您的 ${channelName} 配置成功!\n\n接下来系统会在 Giffgaff 报号日前 170-180 天自动给您推送报号提醒。`
  );

  // 记录本次调用时间（无论成功失败都占用名额）
  lastCallMap.set(ip, now);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: `${channelName} 推送失败: ${result.errorMessage}` },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
