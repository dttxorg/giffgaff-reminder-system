import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

const BodySchema = z.object({
  csv: z.string().min(1),
});

interface ImportResult {
  inserted: number;
  updated: number;
  errors: string[];
}

/**
 * POST /api/admin/sims/import
 * Body: { csv: "phone_number,activated_at\n..." }
 * 策略：同号存在则更新激活日期，不存在则插入
 */
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
    return NextResponse.json({ ok: false, error: "参数错误" }, { status: 400 });
  }

  const result: ImportResult = { inserted: 0, updated: 0, errors: [] };
  const lines = parsed.data.csv.split(/\r?\n/);
  let lineNo = 0;
  for (const raw of lines) {
    lineNo++;
    const line = raw.trim();
    if (!line) continue;
    // 跳过表头
    if (lineNo === 1 && /^phone/i.test(line)) continue;

    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 2) {
      result.errors.push(`第 ${lineNo} 行: 缺少列`);
      continue;
    }
    const [phoneRaw, dateRaw] = parts;
    const phone = phoneRaw.replace(/\D/g, "");
    if (!/^\d{6,}$/.test(phone)) {
      result.errors.push(`第 ${lineNo} 行: 手机号格式错 (${phoneRaw})`);
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      result.errors.push(`第 ${lineNo} 行: 日期格式错 (${dateRaw})`);
      continue;
    }
    const [y, m, d] = dateRaw.split("-").map(Number);
    const activatedAt = new Date(Date.UTC(y, m - 1, d));
    if (Number.isNaN(activatedAt.getTime())) {
      result.errors.push(`第 ${lineNo} 行: 日期无效 (${dateRaw})`);
      continue;
    }

    try {
      const existing = await prisma.sim.findUnique({ where: { phoneNumber: phone } });
      if (existing) {
        await prisma.sim.update({
          where: { id: existing.id },
          data: { activatedAt },
        });
        result.updated++;
      } else {
        await prisma.sim.create({
          data: { phoneNumber: phone, activatedAt },
        });
        result.inserted++;
      }
    } catch (e) {
      result.errors.push(
        `第 ${lineNo} 行: 数据库错误 (${e instanceof Error ? e.message : String(e)})`
      );
    }
  }

  return NextResponse.json({ ok: true, ...result });
}
