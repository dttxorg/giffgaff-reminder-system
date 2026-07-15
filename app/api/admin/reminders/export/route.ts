// GET /api/admin/reminders/export?simId=&q=&status=&from=&to=
// 导出 reminders 为 CSV
//
// CSV 列:时间UTC, simId, 号码, day/bucket, 渠道, 用户ID, 状态, 错误信息
// 用 UTF-8 BOM 让 Excel 正确识别中文
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { buildReminderWhere } from "@/lib/admin-reminder-filter";

function csvEscape(v: string | null | undefined): string {
  if (v == null) return "";
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

/** 与页面共用纯函数筛选,手机号搜索不再产生额外 SIM 查询。 */
function buildWhere(params: URLSearchParams) {
  const value = (key: string) => params.get(key) || undefined;
  return buildReminderWhere({
    simId: value("simId"),
    q: value("q"),
    status: value("status"),
    from: value("from"),
    to: value("to"),
    channel: value("channel"),
    bound: value("bound"),
  });
}

export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const where = buildWhere(searchParams);

  // 导出上限 5000 条,避免大查询超时;分页可后续再加
  const reminders = await prisma.reminderSent.findMany({
    where,
    orderBy: { sentAt: "desc" },
    take: 5000,
    select: {
      sentAt: true,
      simId: true,
      dayOffset: true,
      bucket: true,
      userId: true,
      status: true,
      errorMessage: true,
      sim: { select: { phoneNumber: true } },
    },
  });

  const header = "时间UTC, simId, 号码, day/bucket, 用户ID, 状态, 错误\n";
  const lines = reminders.map((r) =>
    [
      r.sentAt.toISOString().replace("T", " ").slice(0, 19),
      String(r.simId),
      csvEscape(r.sim.phoneNumber),
      `d${r.dayOffset}/b${r.bucket}`,
      String(r.userId),
      r.status,
      csvEscape(r.errorMessage),
    ].join(",")
  );

  const bom = "\uFEFF";
  const body = bom + header + lines.join("\n") + (lines.length ? "\n" : "");

  // 文件名带时间戳,避免覆盖
  const ts = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");
  const filename = `reminders_${ts}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
