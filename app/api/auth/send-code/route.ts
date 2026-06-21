import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { toLookupKey } from "@/lib/phone";
import { generateVerificationCode } from "@/lib/auth";
import { sendPush } from "@/lib/channels";

const BodySchema = z.object({
  simNumber: z.string().min(1, "请输入 giffgaff 号码"),
  channel: z.enum(["serverchan", "bark"]),
  channelKey: z.string().min(1, "请输入渠道 Key"),
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
    const first = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: first?.message ?? "参数错误" }, { status: 400 });
  }

  const { simNumber, channel, channelKey } = parsed.data;
  const lookupKey = toLookupKey(simNumber);
  if (!lookupKey) {
    return NextResponse.json({ ok: false, error: "号码至少 6 位数字" }, { status: 400 });
  }

  // 模糊匹配 sim
  const sims = await prisma.sim.findMany({
    where: {
      phoneNumber: { endsWith: lookupKey },
      status: "active",
    },
    orderBy: { id: "asc" },
    take: 2,
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

  // 生成 6 位验证码
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // 写库（旧的同号码未使用验证码会被新请求覆盖，因为按 simLookupKey 查 → 删旧 → 写新）
  await prisma.verificationCode.deleteMany({
    where: { simLookupKey: lookupKey, used: false },
  });
  await prisma.verificationCode.create({
    data: { simLookupKey: lookupKey, code, channel, channelKey, expiresAt },
  });

  // 推送到用户渠道（仅通知，channelKey 由用户自己提供，不存库这一步）
  const sendResult = await sendPush(
    channel,
    channelKey,
    "Giffgaff 验证码",
    `您的验证码是 ${code},5 分钟内有效。如非本人操作请忽略。`
  );

  if (!sendResult.ok) {
    return NextResponse.json(
      { ok: false, error: `推送失败: ${sendResult.errorMessage}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
