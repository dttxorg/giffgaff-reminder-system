import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeUsername } from "@/lib/auth";
import { createUserSession } from "@/lib/session";
import { verifyPassword } from "@/lib/auth";

const BodySchema = z.object({
  username: z.string().min(1, "请输入账号"),
  password: z.string().min(1, "请输入密码"),
});

// 登录限流参数
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 分钟

/**
 * POST /api/auth/login
 * username + password 登录
 *
 * 安全设计：
 * - username 入库前 normalizeUsername (lowercase + trim,去空格/横线)
 * - 错 5 次锁账号 15 分钟(DB 持久化,serverless 多实例安全)
 * - 旧 user(passwordHash = NULL)拒绝登录,提示联系管理员重置
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

  // username 可以是:
  //  - 自定义账号: alice_2024 (normalizeUsername → lowercase)
  //  - 手机号: 07724215611 / "07724 215611" (normalizeUsername → 去空格/横线)
  const username = normalizeUsername(parsed.data.username);
  if (!username) {
    return NextResponse.json({ ok: false, error: "账号不合法" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: { sims: { orderBy: { id: "asc" } } },
  });
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "账号或密码错误" },
      { status: 401 }
    );
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return NextResponse.json(
      { ok: false, error: `账号已锁定,请 ${minutesLeft} 分钟后再试` },
      { status: 429 }
    );
  }

  if (!user.passwordHash) {
    return NextResponse.json(
      { ok: false, error: "账号未升级密码登录,请联系管理员在后台重置密码" },
      { status: 401 }
    );
  }

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
        { ok: false, error: `密码错误次数过多,账号已锁定 ${LOCK_DURATION_MS / 60000} 分钟` },
        { status: 429 }
      );
    }
    const remaining = MAX_FAILED_ATTEMPTS - newCount;
    return NextResponse.json(
      { ok: false, error: `账号或密码错误,还可尝试 ${remaining} 次` },
      { status: 401 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  await createUserSession(user.id);
  // 任何一张 sim 还没设 channel 都提示去 /me/settings
  const needSetupChannel = user.sims.some((s) => !s.channelKey);
  return NextResponse.json({
    ok: true,
    redirect: "/me",
    needSetupChannel,
  });
}
