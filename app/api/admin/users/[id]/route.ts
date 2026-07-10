import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/users/[id]
 * 管理员删除某个用户(危险操作)
 * - 不级联删除 sim:sim 本身是号码,删除用户后号码仍保留,可被新用户认领
 * - 关联 reminders / sessions 跟随用户被级联删除
 * - 用事务避免半删
 */
export async function DELETE(_req: Request, ctx: RouteContext) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const userId = parseInt(id, 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ ok: false, error: "用户 ID 无效" }, { status: 400 });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, simId: true },
      });
      if (!user) return { kind: "not_found" as const };
      // 先级联删 reminders / sessions(reminders 在 schema 里已配 onDelete: Cascade,
      // sessions 不一定级联,显式删一次更稳)
      await tx.reminderSent.deleteMany({ where: { userId } });
      await tx.userSession.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
      return { kind: "ok" as const, simId: user.simId };
    });
    if (result.kind === "not_found") {
      return NextResponse.json({ ok: false, error: "用户不存在" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, simId: result.simId });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "删除失败" },
      { status: 500 }
    );
  }
}
