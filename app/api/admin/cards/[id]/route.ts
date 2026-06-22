// DELETE /api/admin/cards/[id]
// 删除未兑换的卡密（已兑换的不允许删除，留作审计）
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return NextResponse.json({ ok: false, error: "ID 无效" }, { status: 400 });
  }
  const card = await prisma.cardKey.findUnique({ where: { id: idNum } });
  if (!card) {
    return NextResponse.json({ ok: false, error: "卡密不存在" }, { status: 404 });
  }
  if (card.used) {
    return NextResponse.json(
      { ok: false, error: "已兑换的卡密不能删除" },
      { status: 409 }
    );
  }
  await prisma.cardKey.delete({ where: { id: idNum } });
  return NextResponse.json({ ok: true });
}