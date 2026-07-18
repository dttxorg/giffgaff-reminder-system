import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/auth";
import { runReminderScan } from "@/lib/reminder";
import { getPublicBaseUrl } from "@/lib/public-base-url";

/**
 * POST /api/cron/reminders
 * Header: Authorization: Bearer ${CRON_SECRET}
 * 由 cron-job.org 每小时触发
 */
export async function POST(req: Request) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }

  const baseUrl = getPublicBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: "PUBLIC_BASE_URL 配置无效" },
      { status: 503 }
    );
  }

  const result = await runReminderScan({ baseUrl });
  return NextResponse.json({ ok: true, baseUrl, ...result });
}
