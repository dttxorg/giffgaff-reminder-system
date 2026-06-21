import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { toLookupKey } from "@/lib/phone";
import { createUserSession } from "@/lib/session";

const BodySchema = z.object({
  simNumber: z.string().min(1, "请输入 giffgaff 号码"),
  code: z.string().min(4).max(8),
});

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

  const { simNumber, code } = parsed.data;
  const lookupKey = toLookupKey(simNumber);
  if (!lookupKey) {
    return NextResponse.json({ ok: false, error: "号码至少 6 位数字" }, { status: 400 });
  }

  // 模糊匹配 sim
  const sim = await prisma.sim.findFirst({
    where: { phoneNumber: { endsWith: lookupKey }, status: "active" },
    orderBy: { id: "asc" },
  });
  if (!sim) {
    return NextResponse.json({ ok: false, error: "验证码错误" }, { status: 400 });
  }

  // 找匹配的验证码（不过期、未使用）
  const vc = await prisma.verificationCode.findFirst({
    where: {
      simLookupKey: lookupKey,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!vc) {
    return NextResponse.json({ ok: false, error: "验证码错误" }, { status: 400 });
  }

  // 标记已用
  await prisma.verificationCode.update({
    where: { id: vc.id },
    data: { used: true },
  });

  // 找/建 user
  let user = await prisma.user.findUnique({ where: { simId: sim.id } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        simId: sim.id,
        simLookupKey: lookupKey,
        channel: vc.channel,
        channelKey: vc.channelKey,
      },
    });
  } else {
    // 更新 channel（用户可能换了 key）
    user = await prisma.user.update({
      where: { id: user.id },
      data: { channel: vc.channel, channelKey: vc.channelKey, simLookupKey: lookupKey },
    });
  }

  await createUserSession(user.id);
  return NextResponse.json({ ok: true, redirect: "/me" });
}
