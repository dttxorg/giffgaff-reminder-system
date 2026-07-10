import { NextResponse } from "next/server";
import { dayOffsetFromBaseline } from "@/lib/bucket";
import { findSimByParam, ensureSimPortToken } from "@/lib/port-token-db";

interface RouteContext {
  params: Promise<{ simId: string }>;
}

/**
 * GET /api/p/[simId]
 *
 * simId 参数可以是:
 * - 老的 int id(如 "42")→ 仍按 id 查,保证历史推送里的旧 URL 还能用
 * - 新的 portToken(32 字符 url-safe)→ 按 portToken 查,防枚举
 *
 * 当按 id 查到 sim 且 sim 没有 portToken 时,lazy-backfill 一个,这样后续 URL 都会用 token。
 */
export async function GET(_req: Request, ctx: RouteContext) {
  const { simId } = await ctx.params;

  const sim = await findSimByParam(simId);
  if (!sim) {
    return NextResponse.json({ ok: false, error: "sim 不存在" }, { status: 404 });
  }

  // 仅当按 id 命中且没有 token 时,backfill 一个;按 token 命中说明已经有过 token
  if (!sim.portToken && /^\d+$/.test(simId)) {
    await ensureSimPortToken(sim.id).catch(() => {
      // backfill 失败不影响本次响应
    });
  }

  const baseline = sim.lastPortedAt ?? sim.activatedAt;
  const dayOffset = dayOffsetFromBaseline(baseline);
  return NextResponse.json({
    phoneNumber: sim.phoneNumber,
    activatedAt: sim.activatedAt.toISOString().slice(0, 10),
    lastPortedAt: sim.lastPortedAt?.toISOString().slice(0, 10) ?? null,
    dayOffset,
    // 公开给 /p/[simId] page 用:旧 int URL 命中时,client 端 redirect 到 /p/[portToken]
    // 防止公开 URL 可枚举。这是安全修复(P6 修复)的一部分。
    portToken: sim.portToken,
  });
}
