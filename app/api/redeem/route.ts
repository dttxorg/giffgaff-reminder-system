// POST /api/redeem
// 卡密兑换。两类入口:
//  1) 未登录:必须 username + password,创建新 user + sim,自动登录
//  2) 已登录:追加卡(只要 card+phone+date),把新 sim 挂到当前 user
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { redeemCard } from "@/lib/redeem";
import { createUserSession, getCurrentUserId } from "@/lib/session";
import { normalizeUsername, usernameError } from "@/lib/auth";
import {
  enforceRateLimits,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { passwordStrength } from "@/lib/password-strength";
import {
  redeemErrorMessage,
  redeemErrorStatus,
} from "@/lib/redeem-errors";

const NewUserBodySchema = z.object({
  code: z.string().min(1, "请输入卡密").max(64),
  username: z.string().min(1, "请输入账号").max(64),
  password: z
    .string()
    .min(8, "密码至少 8 位")
    .max(128, "密码过长")
    .refine((value) => passwordStrength(value) !== "weak", "密码强度过低"),
  phoneNumber: z.string().min(1, "请输入手机号").max(32),
  activatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "请输入有效日期"),
  carrier: z.enum(["giffgaff", "ctexcel"]).default("giffgaff"),
});

const AppendBodySchema = z.object({
  code: z.string().min(1, "请输入卡密").max(64),
  phoneNumber: z.string().min(1, "请输入手机号").max(32),
  activatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "请输入有效日期"),
  carrier: z.enum(["giffgaff", "ctexcel"]).default("giffgaff"),
});

export async function POST(req: Request) {
  const limited = await enforceRateLimits([
    {
      scope: "redeem-ip",
      identifiers: [getClientIp(req)],
      limit: 10,
      windowMs: 15 * 60 * 1000,
    },
  ]);
  if (!limited.allowed) return rateLimitResponse(limited);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体格式错误" }, { status: 400 });
  }

  // 检测登录态,决定走哪条 zod schema
  const currentUserId = await getCurrentUserId();

  if (currentUserId !== null) {
    // 追加卡场景:不需 username/password
    const parsed = AppendBodySchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { ok: false, error: issue?.message || "参数错误" },
        { status: 400 }
      );
    }
    return await runRedeem(parsed.data, currentUserId);
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
    | { code: string; phoneNumber: string; activatedAt: string; carrier: "giffgaff" | "ctexcel"; password: string; username: string }
    | { code: string; phoneNumber: string; activatedAt: string; carrier: "giffgaff" | "ctexcel" },
  currentUserId: number | undefined
) {
  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      // 仅在 data 上有这些字段时才传入
      const input: { rawCode: string; phoneNumber: string; activatedAt: string; carrier: "giffgaff" | "ctexcel"; password?: string; username?: string } = {
        rawCode: data.code,
        phoneNumber: data.phoneNumber,
        activatedAt: data.activatedAt,
        carrier: data.carrier,
      };
      if ("password" in data) input.password = data.password;
      if ("username" in data) input.username = data.username;
      return redeemCard(input, currentUserId, tx);
    });
  } catch (e) {
    console.error("[redeem] transaction failed", e);
    return NextResponse.json(
      { ok: false, error: "兑换暂时失败，请稍后重试" },
      { status: 500 }
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: redeemErrorMessage(result.error) },
      { status: redeemErrorStatus(result.error) }
    );
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
