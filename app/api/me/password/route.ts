import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUserId, getCurrentUserSessionId } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { passwordStrength } from "@/lib/password-strength";

const BodySchema = z.object({
  oldPassword: z.string().min(1, "请输入当前密码").max(128),
  newPassword: z
    .string()
    .min(8, "新密码至少 8 位")
    .max(128, "新密码过长")
    .refine((value) => passwordStrength(value) !== "weak", "新密码强度过低"),
});

/**
 * POST /api/me/password
 * 用户修改自己的登录密码
 * - 验证当前密码
 * - 设置新密码（scrypt 哈希）
 * - 清空失败计数
 */
export async function POST(req: Request) {
  const [userId, sessionId] = await Promise.all([
    getCurrentUserId(),
    getCurrentUserSessionId(),
  ]);
  if (!userId || !sessionId) {
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

  const fresh = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
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
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    }),
    prisma.userSession.deleteMany({
      where: { userId, id: { not: sessionId } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
