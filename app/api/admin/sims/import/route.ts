import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { generatePortToken } from "@/lib/port-token";
import { invalidatePublicSimCache } from "@/lib/public-sim-cache";
import { mapWithConcurrency } from "@/lib/async-pool";

const BodySchema = z.object({
  csv: z.string().min(1),
});

interface ImportResult {
  inserted: number;
  updated: number;
  errors: string[];
}

interface ParsedRow {
  lineNo: number;
  phone: string;
  activatedAt: Date;
}

interface PhonePlan {
  phone: string;
  rows: ParsedRow[];
  activatedAt: Date;
}

const WRITE_CONCURRENCY = 6;

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
  const validRows: ParsedRow[] = [];
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
    if (
      Number.isNaN(activatedAt.getTime()) ||
      activatedAt.getUTCFullYear() !== y ||
      activatedAt.getUTCMonth() !== m - 1 ||
      activatedAt.getUTCDate() !== d
    ) {
      result.errors.push(`第 ${lineNo} 行: 日期无效 (${dateRaw})`);
      continue;
    }

    validRows.push({ lineNo, phone, activatedAt });
  }

  if (validRows.length === 0) {
    return NextResponse.json({ ok: true, ...result });
  }

  const rowsByPhone = new Map<string, ParsedRow[]>();
  for (const row of validRows) {
    const rows = rowsByPhone.get(row.phone) ?? [];
    rows.push(row);
    rowsByPhone.set(row.phone, rows);
  }

  const plans: PhonePlan[] = Array.from(rowsByPhone, ([phone, rows]) => ({
    phone,
    rows,
    activatedAt: rows[rows.length - 1].activatedAt,
  }));

  let existingSims: Array<{ id: number; phoneNumber: string; portToken: string | null }>;
  try {
    existingSims = await prisma.sim.findMany({
      where: { phoneNumber: { in: plans.map((plan) => plan.phone) } },
      select: { id: true, phoneNumber: true, portToken: true },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    for (const row of validRows) {
      result.errors.push(`第 ${row.lineNo} 行: 数据库错误 (${detail})`);
    }
    return NextResponse.json({ ok: true, ...result });
  }

  const existingByPhone = new Map(
    existingSims.map((sim) => [sim.phoneNumber, sim])
  );
  const createPlans = plans.filter((plan) => !existingByPhone.has(plan.phone));
  const updatePlans = plans.filter((plan) => existingByPhone.has(plan.phone));

  const createTask = createPlans.length
    ? prisma.sim
        .createMany({
          data: createPlans.map((plan) => ({
            phoneNumber: plan.phone,
            portToken: generatePortToken(),
            activatedAt: plan.activatedAt,
          })),
        })
        .then(() => null)
        .catch((error: unknown) =>
          error instanceof Error ? error.message : String(error)
        )
    : Promise.resolve<string | null>(null);

  const updateTask = mapWithConcurrency(
    updatePlans,
    WRITE_CONCURRENCY,
    async (plan) => {
      const existing = existingByPhone.get(plan.phone)!;
      try {
        await prisma.sim.update({
          where: { id: existing.id },
          data: { activatedAt: plan.activatedAt },
          select: { id: true },
        });
        invalidatePublicSimCache(existing);
        return { plan, error: null as string | null };
      } catch (error) {
        return {
          plan,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );

  const [createError, updateOutcomes] = await Promise.all([
    createTask,
    updateTask,
  ]);

  for (const plan of createPlans) {
    if (createError) {
      for (const row of plan.rows) {
        result.errors.push(`第 ${row.lineNo} 行: 数据库错误 (${createError})`);
      }
      continue;
    }
    result.inserted += 1;
    // 同一 CSV 内重复的新号码：首行等价于插入，后续行等价于更新。
    result.updated += plan.rows.length - 1;
  }

  for (const outcome of updateOutcomes) {
    if (outcome.error) {
      for (const row of outcome.plan.rows) {
        result.errors.push(
          `第 ${row.lineNo} 行: 数据库错误 (${outcome.error})`
        );
      }
      continue;
    }
    result.updated += outcome.plan.rows.length;
  }

  return NextResponse.json({ ok: true, ...result });
}
