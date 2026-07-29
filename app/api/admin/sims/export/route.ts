// GET /api/admin/sims/export?q=&status=
// 导出 sims 列表为 CSV
//
// 复用 /admin/sims 的 q (手机号模糊) + status (active/paused) 筛选。
// CSV 列: simId, 号码, 激活日期, 上次保号, 状态, 渠道, 是否绑定用户, 最后发送时间, 状态, 错误
//
// 同时包含 reminders[0] (最近一次发送),便于排查"这个 sim 最近推送情况"。
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { dayOffsetFromBaseline, isInReminderWindow } from "@/lib/bucket";
import { normalizePhone } from "@/lib/phone";
import type { Prisma } from "@/lib/generated/prisma/client";

function csvEscape(v: string | null | undefined): string {
  if (v == null) return "";
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

async function buildWhere(q: string | null, status: string | null): Promise<Prisma.SimWhereInput> {
  const where: Prisma.SimWhereInput = {};
  if (q) {
    const cleaned = normalizePhone(q);
    where.phoneNumber = { contains: cleaned || q };
  }
  if (status === "active" || status === "paused") {
    where.status = status;
  }
  return where;
}

export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const status = searchParams.get("status");
  const where = await buildWhere(q, status);

  // take: 5000 防 OOM;分页可后续加
  const sims = await prisma.sim.findMany({
    where,
    orderBy: { id: "desc" },
    take: 5000,
    include: {
      user: { select: { username: true } },
      reminders: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { sentAt: true, status: true, errorMessage: true },
      },
    },
  });

  const header =
    "simId,号码,运营商,提醒开始日,截止日,激活日期,上次保号,已激活天数,提醒窗口内,状态,渠道(sim),绑定账号,最后发送时间,最后状态,最后错误\n";
  const lines = sims.map((s) => {
    const baseline = s.lastPortedAt ?? s.activatedAt;
    const days = dayOffsetFromBaseline(baseline);
    const inWindow = isInReminderWindow(days, s) ? "是" : "否";
    const last = s.reminders[0];
    return [
      String(s.id),
      csvEscape(s.phoneNumber),
      s.carrier,
      String(s.reminderStartDay),
      String(s.cycleDays),
      s.activatedAt.toISOString().slice(0, 10),
      s.lastPortedAt ? s.lastPortedAt.toISOString().slice(0, 10) : "",
      String(days),
      inWindow,
      s.status,
      // 1:N - 渠道在 sim 自己(可独立设)
      csvEscape(s.channel),
      s.user ? csvEscape(s.user.username) : "",
      last
        ? last.sentAt.toISOString().replace("T", " ").slice(0, 19)
        : "",
      last ? last.status : "",
      csvEscape(last?.errorMessage),
    ].join(",");
  });

  const bom = "\uFEFF";
  const body = bom + header + lines.join("\n") + (lines.length ? "\n" : "");

  const ts = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");
  const filename = `sims_${ts}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
