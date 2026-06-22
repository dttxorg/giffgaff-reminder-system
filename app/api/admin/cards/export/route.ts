// GET /api/admin/cards/export?used=false&mode=unbound
// 导出 CSV（未兑换的 unbound 卡密为主，给分销商用）
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { formatCardCode } from "@/lib/card-key";
import type { Prisma } from "@/lib/generated/prisma/client";

function csvEscape(v: string | null | undefined): string {
  if (v == null) return "";
  // 包含 , " 换行 → 加双引号 + 双引号转义
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
  const mode = searchParams.get("mode");
  const used = searchParams.get("used");

  const where: Prisma.CardKeyWhereInput = {};
  if (mode === "bound" || mode === "unbound") where.mode = mode;
  if (used === "true") where.used = true;
  if (used === "false") where.used = false;

  const cards = await prisma.cardKey.findMany({
    where,
    orderBy: { id: "asc" },
  });

  const header = "卡密,模式,手机号,激活日期,状态,备注,创建时间\n";
  const lines = cards.map((c) =>
    [
      formatCardCode(c.code),
      c.mode,
      c.phoneNumber ?? "",
      c.activatedAt ? c.activatedAt.toISOString().slice(0, 10) : "",
      c.used ? "已兑换" : "未兑换",
      csvEscape(c.notes),
      c.createdAt.toISOString().slice(0, 19).replace("T", " "),
    ]
      .map(csvEscape)
      .join(",")
  );

  // 加 BOM 让 Excel 正确识别 UTF-8
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