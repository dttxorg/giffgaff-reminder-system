// POST /api/redeem
// 卡密兑换。无需登录。成功后自动登录跳 /me
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { redeemCard } from "@/lib/redeem";
import { createUserSession } from "@/lib/session";

const BodySchema = z.object({
  code: z.string().min(1, "请输入卡密"),
  phoneNumber: z.string().min(1, "请输入手机号"),
  activatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "请输入有效日期"),
  password: z.string().min(8, "密码至少 8 位"),
});

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: "卡密格式不正确",
  NOT_FOUND: "卡密不存在",
  EXPIRED: "卡密已过期",
  ALREADY_USED: "卡密已被兑换,无法重复使用",
  INVALID_PHONE: "手机号格式不正确",
  INVALID_DATE: "激活日期格式不正确 (yyyy-MM-dd)",
  PASSWORD_TOO_SHORT: "密码至少 8 位",
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

  // 用事务确保 sim/user/cardKey 更新原子性
  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      return redeemCard(
        {
          rawCode: parsed.data.code,
          phoneNumber: parsed.data.phoneNumber,
          activatedAt: parsed.data.activatedAt,
          password: parsed.data.password,
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

  // 自动登录
  await createUserSession(result.userId);

  return NextResponse.json({
    ok: true,
    redirect: "/me",
    needSetupChannel: true,
  });
}