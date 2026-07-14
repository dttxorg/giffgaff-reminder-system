// POST /api/redeem
// 卡密兑换。两类入口:
//  1) 未登录:必须 username + password,创建新 user + sim,自动登录
//  2) 已登录:追加卡(只要 card+phone+date),把新 sim 挂到当前 user
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { redeemCard } from "@/lib/redeem";
import { createUserSession, getCurrentUser } from "@/lib/session";
import { normalizeUsername, usernameError } from "@/lib/auth";

const NewUserBodySchema = z.object({
  code: z.string().min(1, "请输入卡密"),
  username: z.string().min(1, "请输入账号"),
  password: z.string().min(8, "密码至少 8 位"),
  phoneNumber: z.string().min(1, "请输入手机号"),
  activatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "请输入有效日期"),
});

const AppendBodySchema = z.object({
  code: z.string().min(1, "请输入卡密"),
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
  PASSWORD_REQUIRED: "首次兑换必须设置登录密码",
  PASSWORD_TOO_SHORT: "密码至少 8 位",
  USERNAME_REQUIRED: "首次兑换必须设置账号",
  USERNAME_INVALID: "账号格式不正确(3-20 位小写字母开头;或 6+ 位纯数字手机号)",
  USERNAME_TAKEN: "该账号已被占用,请换一个",
  USER_NOT_FOUND: "账号不存在,请重新登录",
  PHONE_TAKEN: "该手机号已被绑定,请联系管理员",
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体格式错误" }, { status: 400 });
  }

  // 检测登录态,决定走哪条 zod schema
  const currentUser = await getCurrentUser();

  if (currentUser) {
    // 追加卡场景:不需 username/password
    const parsed = AppendBodySchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { ok: false, error: issue?.message || "参数错误" },
        { status: 400 }
      );
    }
    return await runRedeem(parsed.data, currentUser.id);
  }

  // 未登录:必须带 username + password
  const parsed = NewUserBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: issue?.message || "参数错误" },
      { status: 400 }
    );
  }
  const usernameNorm = normalizeUsername(parsed.data.username);
  const uErr = usernameError(usernameNorm);
  if (uErr) {
    return NextResponse.json({ ok: false, error: uErr }, { status: 400 });
  }
  return await runRedeem({ ...parsed.data, username: usernameNorm }, undefined);
}

async function runRedeem(
  data:
    | { code: string; phoneNumber: string; activatedAt: string; password: string; username: string }
    | { code: string; phoneNumber: string; activatedAt: string },
  currentUserId: number | undefined
) {
  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      // 仅在 data 上有这些字段时才传入
      const input: { rawCode: string; phoneNumber: string; activatedAt: string; password?: string; username?: string } = {
        rawCode: data.code,
        phoneNumber: data.phoneNumber,
        activatedAt: data.activatedAt,
      };
      if ("password" in data) input.password = data.password;
      if ("username" in data) input.username = data.username;
      return redeemCard(input, currentUserId, tx);
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

  // 新用户自动登录;已登录追加卡无需重登
  if (result.isNewUser) {
    await createUserSession(result.userId);
  }

  return NextResponse.json({
    ok: true,
    redirect: "/me",
    isNewUser: result.isNewUser,
    simId: result.simId,
    needSetupChannel: result.isNewUser, // 新用户首张 sim 没设渠道,引导去 /me/settings
  });
}
