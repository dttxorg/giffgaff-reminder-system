import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";

const BodySchema = z.object({
  oldPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z.string().min(8, "新密码至少 8 位"),
});

/**
 * POST /api/me/password
 * 用户修改自己的登录密码
 * - 验证当前密码
 * - 设置新密码（scrypt 哈希）
 * - 清空失败计数
 */
export async function POST(req: Request) {
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

  // 重新查最新 user（getCurrentUser 返回的可能是缓存）
  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh || !fresh.passwordHash) {
    return NextResponse.json(
      { ok: false, error: "账号未初始化密码,请联系管理员" },
      { status: 400 }
    );
  }

  const ok = await verifyPassword(parsed.data.oldPassword, fresh.passwordHash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "当前密码不正确" }, { status: 401 });
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  return NextResponse.json({ ok: true });
}