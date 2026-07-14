// POST /api/admin/cards/import
// 批量导入兑换码(把已有卡密列表批量录入系统)
//
// Body:
//   - codes: string[]   原始 16 位卡密(可带分隔符 "-" / 空格 / 换行,内部归一化)
//   - notes?: string    批次备注
//
// 返回:
//   { ok: true, imported: number, skipped: number, errors: [{input, reason}] }
//
// 设计:
//   - 一次性最多导入 1000 张(超过报错)
//   - 重复(已在 DB 里)自动跳过,不算错误
//   - 格式错误 / 长度错 / 字符错 → 进 errors[]
//   - 用事务批量 INSERT,失败回滚
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { normalizeCardCode } from "@/lib/card-key";

const BodySchema = z.object({
  codes: z.array(z.string()).min(1, "请至少输入 1 个卡密").max(10000, "单次最多 10000 个"),
  notes: z.string().max(200).optional(),
});

const MAX_IMPORT = 1000;
const VALID_RE = /^[A-Z0-9]{16}$/;

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
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "参数错误" },
      { status: 400 }
    );
  }

  if (parsed.data.codes.length > MAX_IMPORT) {
    return NextResponse.json(
      { ok: false, error: `单次最多导入 ${MAX_IMPORT} 张,本次有 ${parsed.data.codes.length} 张` },
      { status: 400 }
    );
  }

  // 归一化 + 去重(用户输入里可能有重复)
  const seen = new Set<string>();
  const errors: Array<{ input: string; reason: string }> = [];
  const normalized: string[] = [];

  for (const raw of parsed.data.codes) {
    const code = normalizeCardCode(raw);
    if (code.length !== 16) {
      errors.push({ input: raw, reason: "长度不是 16 位" });
      continue;
    }
    if (!VALID_RE.test(code)) {
      errors.push({ input: raw, reason: "包含非法字符(只允许 A-Z 0-9)" });
      continue;
    }
    if (seen.has(code)) {
      errors.push({ input: raw, reason: "输入内重复" });
      continue;
    }
    seen.add(code);
    normalized.push(code);
  }

  if (normalized.length === 0) {
    return NextResponse.json({
      ok: true,
      imported: 0,
      skipped: 0,
      errors,
    });
  }

  // 查 DB 中已存在的(批量 IN 查询)
  const existing = await prisma.cardKey.findMany({
    where: { code: { in: normalized } },
    select: { code: true },
  });
  const existingSet = new Set(existing.map((e) => e.code));
  const toImport = normalized.filter((c) => !existingSet.has(c));
  const skipped = normalized.length - toImport.length;

  // 批量 insert(用 createMany 跳过重复,虽然已经过滤过)
  if (toImport.length > 0) {
    try {
      await prisma.cardKey.createMany({
        data: toImport.map((code) => ({
          code,
          notes: parsed.data.notes || null,
        })),
        skipDuplicates: true, // 兜底
      });
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : "导入失败" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    imported: toImport.length,
    skipped,
    errors,
  });
}
