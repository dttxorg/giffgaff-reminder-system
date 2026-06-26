import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { sendPush } from "@/lib/channels";

const BodySchema = z.object({
  channel: z.enum(["serverchan", "bark", "pushplus", "telegram"]),
  channelKey: z.string().min(1, "请填写渠道 Key"),
  /** 客户端先用 test-push 验证过，true 才允许保存 */
  verified: z.boolean().optional().default(false),
});

/**
 * POST /api/me/channel
 * 更新当前登录用户的通知渠道
 *
 * 安全：要求前端先调 /api/auth/test-push 验证 key 配对成功后才能保存
 * （通过 verified=true 标记）。这样可以：
 * 1. 防止用户保存一个错误的 key 导致后续推送全部失败
 * 2. 节省一次 Sever酱/Bark 配额
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
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

  const { channel, channelKey, verified } = parsed.data;

  // 如果没验证过 key，服务端再验证一次（双重保险）
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

  await prisma.user.update({
    where: { id: user.id },
    data: { channel, channelKey },
  });

  return NextResponse.json({ ok: true });
}
