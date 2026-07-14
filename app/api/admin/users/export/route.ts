// GET /api/admin/users/export?channel=&password=
// 导出用户列表为 CSV
//
// CSV 列:用户ID, 账号(手机号或自定义名), 号码(多卡用|分隔), 渠道(去重用/分隔), 密码, 推送数, 注册时间
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
    // 1:N 模型下,渠道在 sim 上
    where.sims = { some: { channel } };
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

  const users = await prisma.user.findMany({
    where,
    orderBy: { id: "desc" },
    take: 10000,
    include: {
      sims: { select: { phoneNumber: true, channel: true } },
      _count: { select: { reminders: true } },
    },
  });

  const header = "用户ID,账号,号码(多卡用|分隔),渠道(去重用/分隔),已设密码,推送数,注册时间(UTC)\n";
  const lines = users.map((u) =>
    [
      String(u.id),
      csvEscape(u.username),
      csvEscape(u.sims.map((s) => s.phoneNumber).join("|")),
      csvEscape(Array.from(new Set(u.sims.map((s) => s.channel))).join("/")),
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
