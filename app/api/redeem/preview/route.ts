// GET /api/redeem/preview?code=XXXX
// 校验卡密是否可兑换（不修改任何数据）
import { NextResponse } from "next/server";
import { normalizeCardCode } from "@/lib/card-key";
import { prisma } from "@/lib/db";
import {
  enforceRateLimits,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") || "";
  const raw = normalizeCardCode(code);
  if (raw.length !== 16) {
    return NextResponse.json({ ok: false, error: "卡密格式不正确" }, { status: 400 });
  }
  const limited = await enforceRateLimits([
    {
      scope: "redeem-preview-ip",
      identifiers: [getClientIp(req)],
      limit: 10,
      windowMs: 60 * 1000,
    },
    {
      scope: "redeem-preview-code",
      identifiers: [raw],
      limit: 3,
      windowMs: 15 * 60 * 1000,
    },
  ]);
  if (!limited.allowed) return rateLimitResponse(limited);
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
    notes: card.notes,
  });
}
