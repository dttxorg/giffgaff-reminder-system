import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  adminMfaConfigurationValid,
  verifyAdminTotp,
} from "@/lib/admin-mfa";
import { createAdminSession } from "@/lib/session";
import {
  enforceRateLimits,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

const BodySchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
  otp: z.string().regex(/^\d{6}$/).optional(),
});

const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$MDEyMzQ1Njc4OWFiY2RlZg==$GxO2F58+LClsnJu/DQccjtLEu6LrjzahHZuQTXhgedLQqO0Mb6Uwhd5Qd7Kxxbn/Q33EWa9atX0xW8xckF5nOw==";

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

  const ip = getClientIp(req);
  const limited = await enforceRateLimits([
    { scope: "admin-login-ip", identifiers: [ip], limit: 10, windowMs: 15 * 60 * 1000 },
    { scope: "admin-login-account", identifiers: [parsed.data.username], limit: 5, windowMs: 15 * 60 * 1000 },
    { scope: "admin-login-pair", identifiers: [ip, parsed.data.username], limit: 5, windowMs: 15 * 60 * 1000 },
  ]);
  if (!limited.allowed) return rateLimitResponse(limited);

  if (!adminMfaConfigurationValid()) {
    return NextResponse.json(
      { ok: false, error: "管理员登录配置不完整" },
      { status: 503 }
    );
  }

  const admin = await prisma.adminUser.findUnique({
    where: { username: parsed.data.username },
    select: { passwordHash: true },
  });
  const passwordOk = await verifyPassword(
    parsed.data.password,
    admin?.passwordHash ?? DUMMY_PASSWORD_HASH
  );
  const otpOk = verifyAdminTotp(parsed.data.otp);
  if (!admin || !passwordOk || !otpOk) {
    return NextResponse.json(
      { ok: false, error: "账号、密码或验证码错误" },
      { status: 401 }
    );
  }

  await createAdminSession();
  return NextResponse.json({ ok: true, redirect: "/admin" });
}
