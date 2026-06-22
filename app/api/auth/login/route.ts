import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { toLookupKey } from "@/lib/phone";
import { createUserSession } from "@/lib/session";
import { verifyPassword } from "@/lib/auth";

const BodySchema = z.object({
  simNumber: z.string().min(1, "请输入 giffgaff 号码"),
  password: z.string().min(1, "请输入密码"),
});

// 登录限流参数
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 分钟

/**
 * POST /api/auth/login
 * 手机号末 6 位 + 密码登录
 *
 * 安全设计：
 * - 错 5 次锁账号 15 分钟（DB 持久化，serverless 多实例安全）
 * - 旧 user（passwordHash = NULL）拒绝登录，提示联系管理员重置
 * - 查 sim 时末 6 位匹配，结果取 id 最小（双保险：业务上 1:1）
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体格式错误" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "参数错误" }, { status: 400 });
  }

  const lookupKey = toLookupKey(parsed.data.simNumber);
  if (!lookupKey) {
    return NextResponse.json({ ok: false, error: "号码至少 6 位数字" }, { status: 400 });
  }

  // 模糊匹配 sim（最多取 1 条；id 最小做兜底）
  const sim = await prisma.sim.findFirst({
    where: { phoneNumber: { endsWith: lookupKey }, status: "active" },
    orderBy: { id: "asc" },
  });
  if (!sim) {
    return NextResponse.json(
      { ok: false, error: "未找到您的号码，请联系管理员添加" },
      { status: 404 }
    );
  }

  // 找 user
  const user = await prisma.user.findUnique({ where: { simId: sim.id } });
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "账号未初始化，请联系管理员" },
      { status: 404 }
    );
  }

  // 检查是否锁定
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return NextResponse.json(
      { ok: false, error: `账号已锁定，请 ${minutesLeft} 分钟后再试` },
      { status: 429 }
    );
  }

  // 旧 user（passwordHash 为 null）：必须管理员在后台重置密码
  if (!user.passwordHash) {
    return NextResponse.json(
      {
        ok: false,
        error: "账号未升级密码登录，请联系管理员在后台重置密码",
      },
      { status: 401 }
    );
  }

  // 验证密码
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    const newCount = user.failedLoginCount + 1;
    const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: shouldLock ? 0 : newCount,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      },
    });
    if (shouldLock) {
      return NextResponse.json(
        {
          ok: false,
          error: `密码错误次数过多，账号已锁定 ${LOCK_DURATION_MS / 60000} 分钟`,
        },
        { status: 429 }
      );
    }
    const remaining = MAX_FAILED_ATTEMPTS - newCount;
    return NextResponse.json(
      { ok: false, error: `密码错误，还可尝试 ${remaining} 次` },
      { status: 401 }
    );
  }

  // 登录成功：清空失败计数
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  await createUserSession(user.id);
  return NextResponse.json({
    ok: true,
    redirect: "/me",
    needSetupChannel: !user.channelKey,
  });
}