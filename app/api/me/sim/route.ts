import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const BodySchema = z.object({
  activatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式 YYYY-MM-DD"),
});

/**
 * PATCH /api/me/sim
 * 修改当前用户 sim 的激活日期
 * - 必须已登录
 * - 日期格式 YYYY-MM-DD
 * - 不能晚于今天（不允许填未来）
 * - 不影响 lastPortedAt（两个字段语义独立：激活日期是 SIM 注册日，
 *   上次保号日期是最近一次保号行为的时间；用户自助改激活日期
 *   通常是为了修正兑换时填错的日期）
 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
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

  await prisma.sim.update({
    where: { id: user.simId },
    data: { activatedAt: newActivated },
  });

  return NextResponse.json({ ok: true });
}
