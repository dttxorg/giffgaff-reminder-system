// POST /api/redeem
// 卡密兑换。每个卡密 = 1 个新 (user, sim) 配对(1:1)。
// 客户必须填: 卡密 + 账号 + 密码 + 手机号 + 激活日期。
// 想多张 SIM?用多个卡密,产生多个独立账号,各自登录。
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { redeemCard } from "@/lib/redeem";
import { createUserSession } from "@/lib/session";
import { normalizeUsername, usernameError } from "@/lib/auth";

const BodySchema = z.object({
  code: z.string().min(1, "请输入卡密"),
  username: z.string().min(1, "请输入账号"),
  password: z.string().min(8, "密码至少 8 位"),
  phoneNumber: z.string().min(1, "请输入手机号"),
  activatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "请输入有效日期"),
});

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: "卡密格式不正确",
  NOT_FOUND: "卡密不存在",
  EXPIRED: "卡密已过期",
  ALREADY_USED: "卡密已被兑换,无法重复使用",
  INVALID_PHONE: "手机号格式不正确",
  INVALID_DATE: "激活日期格式不正确 (yyyy-MM-dd)",
  PASSWORD_TOO_SHORT: "密码至少 8 位",
  USERNAME_INVALID: "账号格式不正确(3-20 位,小写字母开头;或 6+ 位纯数字手机号)",
  USERNAME_TAKEN: "该账号已被占用,请换一个",
  PHONE_TAKEN: "该手机号已被绑定,请联系管理员",
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体格式错误" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: issue?.message || "参数错误" },
      { status: 400 }
    );
  }

  // 提前校验 username 格式
  const usernameNorm = normalizeUsername(parsed.data.username);
  const uErr = usernameError(usernameNorm);
  if (uErr) {
    return NextResponse.json({ ok: false, error: uErr }, { status: 400 });
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      return redeemCard(
        {
          rawCode: parsed.data.code,
          username: usernameNorm,
          password: parsed.data.password,
          phoneNumber: parsed.data.phoneNumber,
          activatedAt: parsed.data.activatedAt,
        },
        tx
      );
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "兑换失败" },
      { status: 500 }
    );
  }

  if (!result.ok) {
    const msg = ERROR_MESSAGES[result.error] ?? "兑换失败";
    const status =
      result.error === "NOT_FOUND" || result.error === "ALREADY_USED" ? 404 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }

  // 自动登录(新用户)
  await createUserSession(result.userId);

  return NextResponse.json({
    ok: true,
    redirect: "/me",
    needSetupChannel: true,
  });
}
