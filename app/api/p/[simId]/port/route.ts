import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidatePublicSimCache } from "@/lib/public-sim-cache";
import { updatePublicSimPortDate } from "@/lib/public-port-write";
import { parseISOCalendarDate, todayShanghaiISODate } from "@/lib/date";
import { looksLikeToken } from "@/lib/port-token";
import {
  enforceRateLimits,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

const BodySchema = z.object({
  portedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式 YYYY-MM-DD"),
});

interface RouteContext {
  params: Promise<{ simId: string }>;
}

/**
 * POST /api/p/[simId]/port
 * 公开 Bearer 链接提交；仅接受随机 portToken，并在成功后立即轮换使旧链接失效。
 * - portedAt 不能晚于今天（不能填未来）
 * - portedAt 不能早于 activatedAt（保号动作只能发生在激活之后）
 *   老用户（卡已用很久）可以补录任意历史日期，系统按该号码的提醒规则重新计时
 */
export async function POST(req: Request, ctx: RouteContext) {
  const { simId } = await ctx.params;

  // 先拒绝无效路径，避免攻击者用任意 path 制造无限量持久限流桶。
  if (!looksLikeToken(simId)) {
    return NextResponse.json({ ok: false, error: "sim 不存在" }, { status: 404 });
  }

  const limited = await enforceRateLimits([
    {
      scope: "public-port-ip-token",
      identifiers: [getClientIp(req), simId],
      limit: 10,
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

  const portedAt = parseISOCalendarDate(parsed.data.portedAt);
  if (!portedAt) {
    return NextResponse.json({ ok: false, error: "保号日期无效" }, { status: 400 });
  }

  const todayShanghai = parseISOCalendarDate(todayShanghaiISODate())!;
  if (portedAt > todayShanghai) {
    return NextResponse.json({ ok: false, error: "保号日期不能晚于今天" }, { status: 400 });
  }

  const outcome = await updatePublicSimPortDate(simId, portedAt);
  if (!outcome.found) {
    return NextResponse.json({ ok: false, error: "sim 不存在" }, { status: 404 });
  }
  if (!outcome.sim) {
    return NextResponse.json({ ok: false, error: "保号日期不能早于激活日期" }, { status: 400 });
  }

  invalidatePublicSimCache(outcome.sim, outcome.previousPortToken);

  return NextResponse.json({ ok: true });
}
