import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { invalidateReminderTemplateCache } from "@/lib/reminder-template-cache";

const BodySchema = z.object({
  template: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
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
  await prisma.setting.upsert({
    where: { key: "reminder_template" },
    create: { key: "reminder_template", value: parsed.data.template },
    update: { value: parsed.data.template },
  });
  invalidateReminderTemplateCache();
  return NextResponse.json({ ok: true });
}
