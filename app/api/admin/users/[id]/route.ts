import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { parsePositiveIntParam } from "@/lib/route-params";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/users/[id]
 * 管理员删除某个用户(危险操作)
 * - 不级联删除 sim:sim 本身是号码,删除用户后号码仍保留(sim.userId 自动 SET NULL),
 *   可被新用户兑换认领
 * - 关联 reminders / sessions 跟随用户被级联删除
 * - 用事务避免半删
 */
export async function DELETE(_req: Request, ctx: RouteContext) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const userId = parsePositiveIntParam(id);
  if (userId === null) {
    return NextResponse.json({ ok: false, error: "用户 ID 无效" }, { status: 400 });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, _count: { select: { sims: true } } },
      });
      if (!user) return { kind: "not_found" as const };
      await tx.reminderSent.deleteMany({ where: { userId } });
      await tx.userSession.deleteMany({ where: { userId } });
      // sim 上的 userId FK 是 SET NULL,所以删 user 后所有 sim 变孤卡
      await tx.user.delete({ where: { id: userId } });
      return { kind: "ok" as const, orphanSimCount: user._count.sims };
    });
    if (result.kind === "not_found") {
      return NextResponse.json({ ok: false, error: "用户不存在" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      orphanSimCount: result.orphanSimCount,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "删除失败" },
      { status: 500 }
    );
  }
}
