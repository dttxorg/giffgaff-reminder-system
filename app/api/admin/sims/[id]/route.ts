import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { invalidatePublicSimCache } from "@/lib/public-sim-cache";
import { getAdminSimDetail } from "@/lib/admin-sim-detail";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const PatchBody = z.object({
  phoneNumber: z.string().min(6).optional(),
  activatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lastPortedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(["active", "paused"]).optional(),
});

export async function GET(_req: Request, ctx: RouteContext) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const simId = parseInt(id, 10);
  if (!Number.isFinite(simId)) {
    return NextResponse.json({ ok: false, error: "id 无效" }, { status: 400 });
  }
  const sim = await getAdminSimDetail(simId);
  if (!sim) {
    return NextResponse.json({ ok: false, error: "sim 不存在" }, { status: 404 });
  }
  return NextResponse.json(sim);
}

export async function PATCH(req: Request, ctx: RouteContext) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const simId = parseInt(id, 10);
  if (!Number.isFinite(simId)) {
    return NextResponse.json({ ok: false, error: "id 无效" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体格式错误" }, { status: 400 });
  }
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "参数错误" }, { status: 400 });
  }

  const data: {
    phoneNumber?: string;
    activatedAt?: Date;
    lastPortedAt?: Date | null;
    status?: "active" | "paused";
  } = {};
  if (parsed.data.phoneNumber) data.phoneNumber = parsed.data.phoneNumber.replace(/\D/g, "");
  // 校验 lastPortedAt >= activatedAt:两个字段必须协同(保号不可能早于激活)。
  // 先看请求里的 activatedAt,否则用数据库里现有的。
  const existingSim = await prisma.sim.findUnique({ where: { id: simId } });
  if (!existingSim) {
    return NextResponse.json({ ok: false, error: "sim 不存在" }, { status: 404 });
  }
  if (parsed.data.activatedAt) {
    const [y, m, d] = parsed.data.activatedAt.split("-").map(Number);
    data.activatedAt = new Date(Date.UTC(y, m - 1, d));
  }
  if (parsed.data.lastPortedAt !== undefined) {
    if (parsed.data.lastPortedAt === null) {
      data.lastPortedAt = null;
    } else {
      const [y, m, d] = parsed.data.lastPortedAt.split("-").map(Number);
      const newLastPortedAt = new Date(Date.UTC(y, m - 1, d));
      const effectiveActivatedAt = data.activatedAt ?? existingSim.activatedAt;
      if (newLastPortedAt < effectiveActivatedAt) {
        return NextResponse.json(
          { ok: false, error: "上次保号日期不能早于激活日期" },
          { status: 400 }
        );
      }
      data.lastPortedAt = newLastPortedAt;
    }
  }
  if (parsed.data.status) data.status = parsed.data.status;

  try {
    // 即使 activatedAt 没变,也要保证 lastPortedAt >= activatedAt(防止旧数据被污染)
    if (
      data.lastPortedAt !== undefined &&
      data.lastPortedAt !== null &&
      data.lastPortedAt < existingSim.activatedAt
    ) {
      return NextResponse.json(
        { ok: false, error: "上次保号日期不能早于现有激活日期" },
        { status: 400 }
      );
    }
    const updated = await prisma.sim.update({ where: { id: simId }, data });
    invalidatePublicSimCache(updated);
    return NextResponse.json({ ok: true, sim: updated });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "更新失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "未授权" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const simId = parseInt(id, 10);
  if (!Number.isFinite(simId)) {
    return NextResponse.json({ ok: false, error: "id 无效" }, { status: 400 });
  }
  try {
    const deleted = await prisma.sim.delete({ where: { id: simId } });
    invalidatePublicSimCache(deleted);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "删除失败" },
      { status: 500 }
    );
  }
}
