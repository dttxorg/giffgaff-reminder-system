import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const BodySchema = z.object({
  portedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式 YYYY-MM-DD"),
});

interface RouteContext {
  params: Promise<{ simId: string }>;
}

/**
 * POST /api/p/[simId]/port
 * 公开（按 simId），用于保号页提交
 * - simId 必须存在
 * - portedAt 不能晚于今天（不能填未来）
 * - portedAt 不能早于 activatedAt（保号动作只能发生在激活之后）
 *   老用户（卡已用很久）可以补录任意历史日期，系统按那天重新计时 170 天
 */
export async function POST(req: Request, ctx: RouteContext) {
  const { simId } = await ctx.params;
  const id = parseInt(simId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "simId 无效" }, { status: 400 });
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

  const sim = await prisma.sim.findUnique({ where: { id } });
  if (!sim) {
    return NextResponse.json({ ok: false, error: "sim 不存在" }, { status: 404 });
  }

  // 解析 portedAt（按 UTC 0 点）
  const [y, m, d] = parsed.data.portedAt.split("-").map(Number);
  const portedAt = new Date(Date.UTC(y, m - 1, d));

  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  // 最早可选 = 激活日期（同一天或之后均可；保号不可能早于激活）
  const activatedAt = new Date(Date.UTC(
    sim.activatedAt.getUTCFullYear(),
    sim.activatedAt.getUTCMonth(),
    sim.activatedAt.getUTCDate()
  ));

  if (portedAt > todayUTC) {
    return NextResponse.json({ ok: false, error: "保号日期不能晚于今天" }, { status: 400 });
  }
  if (portedAt < activatedAt) {
    return NextResponse.json({ ok: false, error: "保号日期不能早于激活日期" }, { status: 400 });
  }

  await prisma.sim.update({
    where: { id },
    data: { lastPortedAt: portedAt },
  });

  return NextResponse.json({ ok: true });
}
