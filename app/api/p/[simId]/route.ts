import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dayOffsetFromBaseline } from "@/lib/bucket";

interface RouteContext {
  params: Promise<{ simId: string }>;
}

export async function GET(_req: Request, ctx: RouteContext) {
  const { simId } = await ctx.params;
  const id = parseInt(simId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "simId 无效" }, { status: 400 });
  }
  const sim = await prisma.sim.findUnique({ where: { id } });
  if (!sim) {
    return NextResponse.json({ ok: false, error: "sim 不存在" }, { status: 404 });
  }
  const baseline = sim.lastPortedAt ?? sim.activatedAt;
  const dayOffset = dayOffsetFromBaseline(baseline);
  return NextResponse.json({
    phoneNumber: sim.phoneNumber,
    activatedAt: sim.activatedAt.toISOString().slice(0, 10),
    lastPortedAt: sim.lastPortedAt?.toISOString().slice(0, 10) ?? null,
    dayOffset,
  });
}
