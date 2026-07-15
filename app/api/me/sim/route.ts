import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserId, getCurrentUserSessionId } from "@/lib/session";
import { invalidatePublicSimCache } from "@/lib/public-sim-cache";
import { updateCurrentUserSimActivatedAt } from "@/lib/user-sim-writes";

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
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "参数错误" },
      { status: 400 }
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

  if (parsed.data.simId !== undefined) {
    const outcome = await updateCurrentUserSimActivatedAt(
      sessionId,
      parsed.data.simId,
      newActivated
    );
    if (!outcome.authenticated) {
      return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
    }
    if (outcome.sim) {
      invalidatePublicSimCache(outcome.sim);
      return NextResponse.json({ ok: true, simId: outcome.sim.id });
    }
    if (!outcome.hasSims) {
      return NextResponse.json(
        { ok: false, error: "您账号下没有 SIM 卡" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "无权修改该 SIM 卡" },
      { status: 403 }
    );
  }

  // 兼容旧客户端不传 simId 的路径。
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const firstOwnedSim = await prisma.sim.findFirst({
    where: { userId },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (!firstOwnedSim) {
    return NextResponse.json(
      { ok: false, error: "您账号下没有 SIM 卡" },
      { status: 400 }
    );
  }
  const targetSim = await prisma.sim.update({
    where: { id: firstOwnedSim.id },
    data: { activatedAt: newActivated },
    select: { id: true, portToken: true },
  });
  invalidatePublicSimCache(targetSim);

  return NextResponse.json({ ok: true, simId: targetSim.id });
}
