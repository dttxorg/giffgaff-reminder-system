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

  // 构造 baseUrl：优先用 VERCEL_URL（Vercel 部署），否则用环境变量或 request origin
  const url = new URL(req.url);
  const baseUrl =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.PUBLIC_BASE_URL || `${url.protocol}//${url.host}`;

  const result = await runReminderScan({ baseUrl });
  return NextResponse.json({ ok: true, ...result });
}
