import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/auth";
import { runReminderScan } from "@/lib/reminder";

/**
 * POST /api/cron/reminders
 * Header: Authorization: Bearer ${CRON_SECRET}
 * 由 cron-job.org 每小时触发
 */
export async function POST(req: Request) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }

  // 构造 baseUrl 优先级:
  //   1. PUBLIC_BASE_URL (用户自定义,推荐设置,用于推送里拼接的保号链接)
  //   2. VERCEL_URL (Vercel 默认注入,指向 vercel.app,不推荐给用户)
  //   3. request origin (兜底,生产环境基本不会到这里)
  const url = new URL(req.url);
  const baseUrl =
    process.env.PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    `${url.protocol}//${url.host}`;

  const result = await runReminderScan({ baseUrl });
  return NextResponse.json({ ok: true, baseUrl, ...result });
}
