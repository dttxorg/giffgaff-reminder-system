// GET /api/redeem/preview?code=XXXX
// 预览卡密信息：仅返回 mode + bound 模式的 phoneNumber/activatedAt
// 不修改任何数据,用于前端表单动态渲染
import { NextResponse } from "next/server";
import { normalizeCardCode } from "@/lib/card-key";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") || "";
  const raw = normalizeCardCode(code);
  if (raw.length !== 16) {
    return NextResponse.json({ ok: false, error: "卡密格式不正确" }, { status: 400 });
  }
  const card = await prisma.cardKey.findUnique({ where: { code: raw } });
  if (!card) {
    return NextResponse.json({ ok: false, error: "卡密不存在" }, { status: 404 });
  }
  if (card.used) {
    return NextResponse.json({ ok: false, error: "卡密已被兑换" }, { status: 410 });
  }
  if (card.expiresAt && card.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: "卡密已过期" }, { status: 410 });
  }

  return NextResponse.json({
    ok: true,
    mode: card.mode,
    notes: card.notes,
    // bound 模式返回卡密自带的手机号/激活日期
    ...(card.mode === "bound" && card.phoneNumber && card.activatedAt
      ? {
          phoneNumber: card.phoneNumber,
          activatedAt: card.activatedAt.toISOString().slice(0, 10),
        }
      : {}),
  });
}