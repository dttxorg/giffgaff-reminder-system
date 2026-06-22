// /api/admin/cards
// GET: 列表（按 mode/used 筛选 + 分页）
// POST: 生成（bound 单张 或 unbound N 张）
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { generateCardCode, normalizeCardCode } from "@/lib/card-key";
import { normalizePhone } from "@/lib/phone";
import type { Prisma } from "@/lib/generated/prisma/client";

const GenerateSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("bound"),
    phoneNumber: z.string().min(6),
    activatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(100).optional(),
  }),
  z.object({
    mode: z.literal("unbound"),
    count: z.number().int().min(1).max(500),
    notes: z.string().max(100).optional(),
  }),
]);

// 列表查询
export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode"); // "bound" | "unbound" | null
  const used = searchParams.get("used"); // "true" | "false" | null
  const q = searchParams.get("q");

  const where: Prisma.CardKeyWhereInput = {};
  if (mode === "bound" || mode === "unbound") where.mode = mode;
  if (used === "true") where.used = true;
  if (used === "false") where.used = false;
  if (q) {
    const cleaned = q.trim();
    // 用户可能搜带连字符或不带连字符的
    const raw = normalizeCardCode(cleaned);
    if (raw.length === 16) {
      where.code = raw;
    } else {
      // 模糊搜（按 notes 或 phoneNumber 包含）
      where.OR = [
        { notes: { contains: cleaned, mode: "insensitive" } },
        { phoneNumber: { contains: cleaned.replace(/\D/g, "") } },
      ];
    }
  }

  const cards = await prisma.cardKey.findMany({
    where,
    orderBy: { id: "desc" },
    take: 200,
  });

  return NextResponse.json({ ok: true, cards });
}

// 生成卡密
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

  try {
    if (parsed.data.mode === "bound") {
      const phone = normalizePhone(parsed.data.phoneNumber);
      const [y, m, d] = parsed.data.activatedAt.split("-").map(Number);
      const activatedAt = new Date(Date.UTC(y, m - 1, d));

      // 重复检查：同一 phoneNumber 不能已有 sim，也不能已有未用 bound 卡密
      const [existingSim, existingCard] = await Promise.all([
        prisma.sim.findUnique({ where: { phoneNumber: phone } }),
        prisma.cardKey.findFirst({
          where: { mode: "bound", phoneNumber: phone, used: false },
        }),
      ]);
      if (existingSim) {
        return NextResponse.json(
          { ok: false, error: `手机号 ${phone} 已被录入 sim 库` },
          { status: 409 }
        );
      }
      if (existingCard) {
        return NextResponse.json(
          { ok: false, error: `手机号 ${phone} 还有未兑换的卡密` },
          { status: 409 }
        );
      }

      // 重试生成直到拿到唯一 code（概率极低，但 unique constraint 必须处理）
      let code = "";
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = normalizeCardCode(generateCardCode());
        const dup = await prisma.cardKey.findUnique({ where: { code: candidate } });
        if (!dup) {
          code = candidate;
          break;
        }
      }
      if (!code) {
        return NextResponse.json(
          { ok: false, error: "生成卡密失败,请重试" },
          { status: 500 }
        );
      }

      const created = await prisma.cardKey.create({
        data: {
          code,
          mode: "bound",
          phoneNumber: phone,
          activatedAt,
          notes: parsed.data.notes,
        },
      });
      return NextResponse.json({ ok: true, cards: [created] });
    }

    // unbound 模式: 批量生成
    const count = parsed.data.count;
    const codes = new Set<string>();
    // 一次拿足够多原始码，批量去重
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

    // createMany 在 PG 支持但 Prisma 对 unique 冲突会整体失败 → 改用 create 循环
    const created = [];
    for (const code of finalCodes) {
      try {
        const c = await prisma.cardKey.create({
          data: {
            code,
            mode: "unbound",
            notes: parsed.data.notes,
          },
        });
        created.push(c);
      } catch {
        // unique 冲突静默跳过（极端情况）
      }
    }

    return NextResponse.json({ ok: true, cards: created });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "生成失败" },
      { status: 500 }
    );
  }
}