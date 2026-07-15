import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
import { parsePositiveIntParam } from "@/lib/route-params";

const BodySchema = z.object({
  newPassword: z.string().min(8, "新密码至少 8 位"),
});

/**
 * POST /api/admin/users/[id]/password
 * 管理员重置某个用户的登录密码
 * - 不返回密码明文（管理员应在 UI 端生成后立即告知客户）
 * - 重置后清空失败计数 + 解锁
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const userId = parsePositiveIntParam(id);
  if (userId === null) {
    return NextResponse.json({ ok: false, error: "用户 ID 无效" }, { status: 400 });
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

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "用户不存在" }, { status: 404 });
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  return NextResponse.json({ ok: true });
}
