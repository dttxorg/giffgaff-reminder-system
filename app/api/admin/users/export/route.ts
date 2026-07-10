// GET /api/admin/users/export?channel=&password=
// 导出用户列表为 CSV
//
// CSV 列:用户ID, 号码, 后6位, 渠道, 是否设密码, 推送数, 注册时间
// 与 /admin/users 页面 share 同样的 channel + password 筛选
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import type { Prisma } from "@/lib/generated/prisma/client";

function csvEscape(v: string | null | undefined): string {
  if (v == null) return "";
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function buildWhere(channel: string | null, password: string | null): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (
    channel === "serverchan" ||
    channel === "bark" ||
    channel === "pushplus" ||
    channel === "telegram"
  ) {
    where.channel = channel;
  }
  if (password === "yes") where.passwordHash = { not: null };
  if (password === "no") where.passwordHash = null;
  return where;
}

export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");
  const password = searchParams.get("password");
  const where = buildWhere(channel, password);

  // 一次取出所有匹配的 user(无 take 限制 — 完整导出)
  // 上限 10000 防 OOM,够大多数场景;分页可后续加
  const users = await prisma.user.findMany({
    where,
    orderBy: { id: "desc" },
    take: 10000,
    include: {
      sim: { select: { phoneNumber: true } },
      _count: { select: { reminders: true } },
    },
  });

  const header = "用户ID,号码,后6位,渠道,已设密码,推送数,注册时间(UTC)\n";
  const lines = users.map((u) =>
    [
      String(u.id),
      csvEscape(u.sim.phoneNumber),
      csvEscape(u.simLookupKey),
      u.channel,
      u.passwordHash ? "是" : "否",
      String(u._count.reminders),
      u.createdAt.toISOString().replace("T", " ").slice(0, 19),
    ].join(",")
  );

  const bom = "\uFEFF";
  const body = bom + header + lines.join("\n") + (lines.length ? "\n" : "");

  const ts = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");
  const filename = `users_${ts}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
