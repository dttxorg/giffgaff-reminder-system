import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeUsername } from "@/lib/auth";
import { createUserSession } from "@/lib/session";
import { verifyPassword } from "@/lib/auth";
import {
  enforceRateLimits,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

const BodySchema = z.object({
  username: z.string().min(1, "请输入账号").max(64),
  password: z.string().min(1, "请输入密码").max(128),
});

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$MDEyMzQ1Njc4OWFiY2RlZg==$GxO2F58+LClsnJu/DQccjtLEu6LrjzahHZuQTXhgedLQqO0Mb6Uwhd5Qd7Kxxbn/Q33EWa9atX0xW8xckF5nOw==";

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

  const ip = getClientIp(req);
  const limited = await enforceRateLimits([
    { scope: "user-login-ip", identifiers: [ip], limit: 20, windowMs: LOGIN_WINDOW_MS },
    { scope: "user-login-account", identifiers: [username], limit: 50, windowMs: LOGIN_WINDOW_MS },
    { scope: "user-login-pair", identifiers: [ip, username], limit: 5, windowMs: LOGIN_WINDOW_MS },
  ]);
  if (!limited.allowed) return rateLimitResponse(limited);

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      passwordHash: true,
      _count: {
        select: { sims: { where: { channelKey: "" } } },
      },
    },
  });
  const ok = await verifyPassword(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH
  );
  if (!user || !user.passwordHash || !ok) {
    return NextResponse.json(
      { ok: false, error: "账号或密码错误" },
      { status: 401 }
    );
  }

  // 两项彼此独立，成功登录后并行收尾，少等待一次数据库往返。
  await Promise.all([
    prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    }),
    createUserSession(user.id),
  ]);
  // 任何一张 sim 还没设 channel 都提示去 /me/settings
  const needSetupChannel = user._count.sims > 0;
  return NextResponse.json({
    ok: true,
    redirect: "/me",
    needSetupChannel,
  });
}
