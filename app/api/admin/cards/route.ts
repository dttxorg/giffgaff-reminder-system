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
  // 一次拿足够多原始码，批量去重
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
  const codeList = Array.from(codes).slice(0, count);

  // 检查库内已有（防御性，正常不会冲突）
  const existing = await prisma.cardKey.findMany({
    where: { code: { in: codeList } },
    select: { code: true },
  });
  const existingSet = new Set(existing.map((e) => e.code));
  const finalCodes = codeList.filter((c) => !existingSet.has(c));

  // createMany 在 PG unique 冲突时整体失败 → 改用循环 create
  const created = [];
  for (const code of finalCodes) {
    try {
      const c = await prisma.cardKey.create({
        data: {
          code,
          notes: parsed.data.notes,
        },
      });
      created.push(c);
    } catch {
      // unique 冲突静默跳过（极端情况）
    }
  }

  return NextResponse.json({ ok: true, cards: created });
}