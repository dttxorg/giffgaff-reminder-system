import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const BodySchema = z.object({
  activatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式 YYYY-MM-DD"),
  /** 多卡场景下指明修改哪张 sim;不传时默认 sims[0] */
  simId: z.number().int().positive().optional(),
});

/**
 * PATCH /api/me/sim
 * 修改某张 sim 的激活日期
 *
 * - 必须已登录
 * - sim 必须属于当前用户(防越权改他人 sim)
 * - 日期不能晚于今天
 * - 不影响 lastPortedAt(激活日期 vs 上次保号日期 语义独立)
 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  if (user.sims.length === 0) {
    return NextResponse.json(
      { ok: false, error: "您账号下没有 SIM 卡" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体格式错误" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "参数错误" },
      { status: 400 }
    );
  }

  const ownedSimIds = new Set(user.sims.map((s) => s.id));
  const targetSimId =
    parsed.data.simId !== undefined && ownedSimIds.has(parsed.data.simId)
      ? parsed.data.simId
      : user.sims[0].id;

  if (parsed.data.simId !== undefined && !ownedSimIds.has(parsed.data.simId)) {
    return NextResponse.json(
      { ok: false, error: "无权修改该 SIM 卡" },
      { status: 403 }
    );
  }

  const [y, m, d] = parsed.data.activatedAt.split("-").map(Number);
  const newActivated = new Date(Date.UTC(y, m - 1, d));

  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  if (newActivated > todayUTC) {
    return NextResponse.json(
      { ok: false, error: "激活日期不能晚于今天" },
      { status: 400 }
    );
  }

  await prisma.sim.update({
    where: { id: targetSimId },
    data: { activatedAt: newActivated },
  });

  return NextResponse.json({ ok: true, simId: targetSimId });
}
