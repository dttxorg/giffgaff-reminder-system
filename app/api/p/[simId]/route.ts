import { NextResponse } from "next/server";
import { dayOffsetFromBaseline } from "@/lib/bucket";
import { looksLikeToken } from "@/lib/port-token";
import { getCachedPublicSim } from "@/lib/public-sim-cache";
import { maskPhoneForPublic } from "@/lib/phone";

interface RouteContext {
  params: Promise<{ simId: string }>;
}

/**
 * GET /api/p/[simId]
 *
 * 仅接受 32-64 字符随机 portToken；自增数字 ID 永远返回 404。
 */
export async function GET(_req: Request, ctx: RouteContext) {
  const { simId } = await ctx.params;

  if (!looksLikeToken(simId)) {
    return NextResponse.json({ ok: false, error: "sim 不存在" }, { status: 404 });
  }
  const sim = await getCachedPublicSim(simId);
  if (!sim) {
    return NextResponse.json({ ok: false, error: "sim 不存在" }, { status: 404 });
  }

  const baseline = sim.lastPortedAt ?? sim.activatedAt;
  const dayOffset = dayOffsetFromBaseline(baseline);
  return NextResponse.json({
    phoneNumber: maskPhoneForPublic(sim.phoneNumber),
    activatedAt: sim.activatedAt.toISOString().slice(0, 10),
    lastPortedAt: sim.lastPortedAt?.toISOString().slice(0, 10) ?? null,
    dayOffset,
  });
}
