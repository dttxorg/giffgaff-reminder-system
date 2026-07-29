import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { sendPush } from "@/lib/channels";
import { mapWithConcurrency } from "@/lib/async-pool";
import {
  enforceRateLimits,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

/**
 * POST /api/admin/sims/test-push
 * Body: { simIds: number[] }
 *
 * 给每张 sim 自己的推送渠道(channel/channelKey 在 sim 上)发测试消息。
 * 1:N 模型下,每张 sim 独立渠道。
 *
 * 最多并发处理 5 个不同推送目标；同一渠道 Key 保持串行，避免渠道限流。
 */

const BodySchema = z.object({
  simIds: z.array(z.number().int().positive()).min(1).max(50),
});

const PUSH_CONCURRENCY = 5;

const channelNameMap: Record<string, string> = {
  serverchan: "Sever酱",
  bark: "Bark",
  pushplus: "pushplus",
  telegram: "Telegram",
};

interface TestPushSim {
  id: number;
  phoneNumber: string;
  channel: "serverchan" | "bark" | "pushplus" | "telegram";
  channelKey: string;
}

interface TestPushResult {
  simId: number;
  phoneNumber: string;
  channel: string;
  ok: boolean;
  error?: string;
}

async function sendTestPush(sim: TestPushSim): Promise<TestPushResult> {
  const channelName = channelNameMap[sim.channel] ?? sim.channel;
  const result = await sendPush(
    sim.channel,
    sim.channelKey,
    "SIM 保号提醒 - 管理员测试",
    `🛠️ 管理员触发的推送测试\n\n号码:${sim.phoneNumber}\n渠道:${channelName}\n\n如果您收到这条消息,说明 ${channelName} 配置正常。`
  );
  return {
    simId: sim.id,
    phoneNumber: sim.phoneNumber,
    channel: sim.channel,
    ok: result.ok,
    error: result.ok ? undefined : result.errorMessage,
  };
}

export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const limited = await enforceRateLimits([
    {
      scope: "admin-test-push-ip",
      identifiers: [getClientIp(req)],
      limit: 5,
      windowMs: 60 * 60 * 1000,
    },
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

  const sims = await prisma.sim.findMany({
    where: { id: { in: parsed.data.simIds } },
    select: {
      id: true,
      phoneNumber: true,
      channel: true,
      channelKey: true,
    },
  });

  if (sims.length === 0) {
    return NextResponse.json({ ok: false, error: "未找到这些 sim" }, { status: 404 });
  }

  const missingById = new Map<number, TestPushResult>();
  const groupsByDestination = new Map<string, TestPushSim[]>();
  for (const sim of sims) {
    if (!sim.channelKey) {
      missingById.set(sim.id, {
        simId: sim.id,
        phoneNumber: sim.phoneNumber,
        channel: sim.channel,
        ok: false,
        error: "未配置推送渠道",
      });
      continue;
    }
    const destination = `${sim.channel}:${sim.channelKey}`;
    const group = groupsByDestination.get(destination) ?? [];
    group.push(sim);
    groupsByDestination.set(destination, group);
  }

  const groupedResults = await mapWithConcurrency(
    Array.from(groupsByDestination.values()),
    PUSH_CONCURRENCY,
    async (group) => {
      const results: TestPushResult[] = [];
      for (const sim of group) results.push(await sendTestPush(sim));
      return results;
    }
  );
  const sentById = new Map(
    groupedResults.flat().map((result) => [result.simId, result])
  );
  const results = sims.map(
    (sim) => missingById.get(sim.id) ?? sentById.get(sim.id)!
  );

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.length - successCount;

  return NextResponse.json({
    ok: true,
    summary: { total: results.length, success: successCount, failed: failCount },
    results,
  });
}
