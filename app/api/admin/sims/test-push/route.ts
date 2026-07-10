import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { sendPush } from "@/lib/channels";

/**
 * POST /api/admin/sims/test-push
 * Body: { simIds: number[] }
 *
 * 给每个 sim 对应 user 的推送渠道发一条测试消息("管理员触发的推送测试")。
 * 不消耗用户配额感知(实际 Sever酱 / Bark 等会对每次调用计数)。
 * 不限制次数但每 sim 串行处理,失败不会中断其他 sim。
 */

const BodySchema = z.object({
  simIds: z.array(z.number().int().positive()).min(1).max(50),
});

export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
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

  const sims = await prisma.sim.findMany({
    where: { id: { in: parsed.data.simIds } },
    include: { user: true },
  });

  if (sims.length === 0) {
    return NextResponse.json({ ok: false, error: "未找到这些 sim" }, { status: 404 });
  }

  const results: Array<{
    simId: number;
    phoneNumber: string;
    channel: string | null;
    ok: boolean;
    error?: string;
  }> = [];

  for (const sim of sims) {
    if (!sim.user || !sim.user.channelKey) {
      results.push({
        simId: sim.id,
        phoneNumber: sim.phoneNumber,
        channel: sim.user?.channel ?? null,
        ok: false,
        error: "未配置推送渠道",
      });
      continue;
    }
    const channelNameMap: Record<string, string> = {
      serverchan: "Sever酱",
      bark: "Bark",
      pushplus: "pushplus",
      telegram: "Telegram",
    };
    const channelName =
      channelNameMap[sim.user.channel as string] ?? sim.user.channel;
    const result = await sendPush(
      sim.user.channel as "serverchan" | "bark" | "pushplus" | "telegram",
      sim.user.channelKey,
      "Giffgaff 保号提醒 - 管理员测试",
      `🛠️ 管理员触发的推送测试\n\n号码:${sim.phoneNumber}\n渠道:${channelName}\n\n如果您收到这条消息,说明 ${channelName} 配置正常。`
    );
    results.push({
      simId: sim.id,
      phoneNumber: sim.phoneNumber,
      channel: sim.user.channel,
      ok: result.ok,
      error: result.ok ? undefined : result.errorMessage,
    });
  }

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.length - successCount;

  return NextResponse.json({
    ok: true,
    summary: {
      total: results.length,
      success: successCount,
      failed: failCount,
    },
    results,
  });
}
