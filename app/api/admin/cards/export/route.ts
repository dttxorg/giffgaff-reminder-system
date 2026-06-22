// GET /api/admin/cards/export?used=false
// 导出 CSV（用于给分销商）
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { formatCardCode } from "@/lib/card-key";
import type { Prisma } from "@/lib/generated/prisma/client";

function csvEscape(v: string | null | undefined): string {
  if (v == null) return "";
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const used = searchParams.get("used");

  const where: Prisma.CardKeyWhereInput = {};
  if (used === "true") where.used = true;
  if (used === "false") where.used = false;

  const cards = await prisma.cardKey.findMany({
    where,
    orderBy: { id: "asc" },
  });

  const header = "卡密,状态,备注,创建时间\n";
  const lines = cards.map((c) =>
    [
      formatCardCode(c.code),
      c.used ? "已兑换" : "未兑换",
      csvEscape(c.notes),
      c.createdAt.toISOString().slice(0, 19).replace("T", " "),
    ]
      .map(csvEscape)
      .join(",")
  );

  // BOM 让 Excel 识别 UTF-8
  const bom = "\uFEFF";
  const body = bom + header + lines.join("\n") + (lines.length ? "\n" : "");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cards_${Date.now()}.csv"`,
    },
  });
}