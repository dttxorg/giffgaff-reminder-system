// /api/admin/cards
// GET: 列表（按 used 筛选 + 搜索）
// POST: 批量生成 unbound 卡密
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { generateCardCode, normalizeCardCode } from "@/lib/card-key";
import type { Prisma } from "@/lib/generated/prisma/client";

const GenerateSchema = z.object({
  count: z.number().int().min(1).max(500),
  notes: z.string().max(100).optional(),
});

// 列表查询
export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const used = searchParams.get("used"); // "true" | "false" | null
  const q = searchParams.get("q");

  const where: Prisma.CardKeyWhereInput = {};
  if (used === "true") where.used = true;
  if (used === "false") where.used = false;
  if (q) {
    const cleaned = q.trim();
    const raw = normalizeCardCode(cleaned);
    if (raw.length === 16) {
      where.code = raw;
    } else {
      where.notes = { contains: cleaned, mode: "insensitive" };
    }
  }

  const cards = await prisma.cardKey.findMany({
    where,
    orderBy: { id: "desc" },
    take: 200,
  });

  return NextResponse.json({ ok: true, cards });
}

// 批量生成 unbound 卡密
export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体格式错误" }, { status: 400 });
  }
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "参数错误" },
      { status: 400 }
    );
  }

  const count = parsed.data.count;
  // 先在内存中生成足量的不重复候选；数据库唯一索引负责最终的并发冲突判断。
  const codes = new Set<string>();
  const attempts = count * 2 + 10;
  for (let i = 0; i < attempts && codes.size < count; i++) {
    codes.add(normalizeCardCode(generateCardCode()));
  }
  if (codes.size < count) {
    return NextResponse.json(
      { ok: false, error: "生成卡密失败,请重试" },
      { status: 500 }
    );
  }

  // PostgreSQL 支持 createManyAndReturn + skipDuplicates：一次写入并返回真正落库的码。
  const created = await prisma.cardKey.createManyAndReturn({
    data: Array.from(codes, (code) => ({
      code,
      notes: parsed.data.notes,
    })),
    skipDuplicates: true,
    select: { code: true },
  });

  return NextResponse.json({
    ok: true,
    cards: created,
    requestedCount: count,
    createdCount: created.length,
  });
}
