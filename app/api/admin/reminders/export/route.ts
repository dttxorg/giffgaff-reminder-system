// GET /api/admin/reminders/export?simId=&q=&status=&from=&to=
// 导出 reminders 为 CSV
//
// CSV 列:时间UTC, simId, 号码, day/bucket, 渠道, 用户ID, 状态, 错误信息
// 用 UTF-8 BOM 让 Excel 正确识别中文
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { normalizePhone } from "@/lib/phone";

function csvEscape(v: string | null | undefined): string {
  if (v == null) return "";
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

/**
 * 用与 /admin/reminders 页面相同的筛选参数构造 where。
 * 复制一份以保持导出 API 独立(便于以后改格式不影响查询逻辑)。
 */
async function buildWhere(params: URLSearchParams) {
  const where: {
    simId?: number | { in: number[] };
    status?: "success" | "failed";
    sentAt?: { gte?: Date; lt?: Date };
  } = {};
  const simId = params.get("simId");
  const q = params.get("q");
  const status = params.get("status");

  if (simId) where.simId = parseInt(simId, 10);

  if (q) {
    const cleaned = normalizePhone(q);
    const matchedSims = await prisma.sim.findMany({
      where: { phoneNumber: { contains: cleaned || q } },
      select: { id: true },
      take: 200,
    });
    const ids = matchedSims.map((s) => s.id);
    if (where.simId) {
      const sid = where.simId as number;
      where.simId = ids.includes(sid) ? sid : { in: [] };
    } else {
      where.simId = { in: ids };
    }
  }

  if (status === "success" || status === "failed") where.status = status;

  const from = params.get("from");
  const to = params.get("to");
  const range: { gte?: Date; lt?: Date } = {};
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    range.gte = new Date(from + "T00:00:00Z");
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    range.lt = new Date(to + "T00:00:00Z");
    range.lt.setUTCDate(range.lt.getUTCDate() + 1);
  }
  if (range.gte || range.lt) where.sentAt = range;

  return where;
}

export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const where = await buildWhere(searchParams);

  // 导出上限 5000 条,避免大查询超时;分页可后续再加
  const reminders = await prisma.reminderSent.findMany({
    where,
    orderBy: { sentAt: "desc" },
    take: 5000,
    include: { sim: { select: { phoneNumber: true } } },
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
