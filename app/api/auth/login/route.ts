import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { toLookupKey } from "@/lib/phone";
import { createUserSession } from "@/lib/session";

const BodySchema = z.object({
  simNumber: z.string().min(1, "请输入 giffgaff 号码"),
});

/**
 * POST /api/auth/login
 * 无验证码登录：凭 sim 号码后 6 位匹配 → 自动登录
 *
 * 流程：
 * 1. 归一化号码 → 取后 6 位
 * 2. 查 sim
 * 3. 找/建 user（channel 字段可能为空 → /me 引导设置）
 * 4. 种 session cookie
 *
 * 注意：本路由不做密码/验证码校验。sim 号码本身被视为凭据。
 * 安全性等价于「任何人知道 sim 号码都能进 /me」，
 * 但 /me 只能看自己的 sim 信息，/p/[simId] 公开可改保号日期的设计从 V1 就是这样。
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

  // 模糊匹配 sim
  const sims = await prisma.sim.findMany({
    where: { phoneNumber: { endsWith: lookupKey }, status: "active" },
    orderBy: { id: "asc" },
  });
  if (sims.length === 0) {
    return NextResponse.json(
      { ok: false, error: "未找到您的号码，请联系管理员添加" },
      { status: 404 }
    );
  }
  if (sims.length > 1) {
    // eslint-disable-next-line no-console
    console.warn(`[auth] 末 6 位 ${lookupKey} 匹配到 ${sims.length} 个 sim,自动取 id 最小`);
  }
  const sim = sims[0];

  // 找/建 user（不设 channel，留空让用户去 /me/settings 设）
  let user = await prisma.user.findUnique({ where: { simId: sim.id } });
  if (!user) {
    // eslint-disable-next-line no-console
    console.log(`[auth] 新用户绑定 sim=${sim.id} phoneTail=${lookupKey}`);
    user = await prisma.user.create({
      data: {
        simId: sim.id,
        simLookupKey: lookupKey,
        // channel 留默认值。User 模型上 channel 是 enum 必填，所以给个占位值
        // 但占位值不会真发推送；/me 检测到 channelKey 为空时引导用户设置
        channel: "serverchan",
        channelKey: "",
      },
    });
  } else if (user.simLookupKey !== lookupKey) {
    // 用户用不同的 sim 号码登录过（理论上 1:1，不会发生但保险起见）
    await prisma.user.update({
      where: { id: user.id },
      data: { simLookupKey: lookupKey },
    });
  }

  await createUserSession(user.id);
  return NextResponse.json({
    ok: true,
    redirect: "/me",
    needSetupChannel: !user.channelKey,
  });
}
