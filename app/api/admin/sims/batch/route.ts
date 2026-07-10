import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

/**
 * POST /api/admin/sims/batch
 * Body: { ids: number[], action: "delete" | "pause" | "activate" }
 *
 * 批量操作 sims:删除会级联 user 与 reminders_sent(由 schema onDelete: Cascade 决定),
 * 暂停 / 激活只改 status 字段,不动绑定关系。
 */
const BodySchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
  action: z.enum(["delete", "pause", "activate"]),
});

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

  const { ids, action } = parsed.data;

  try {
    if (action === "delete") {
      const result = await prisma.sim.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ ok: true, affected: result.count });
    }
    if (action === "pause") {
      const result = await prisma.sim.updateMany({
        where: { id: { in: ids } },
        data: { status: "paused" },
      });
      return NextResponse.json({ ok: true, affected: result.count });
    }
    // activate
    const result = await prisma.sim.updateMany({
      where: { id: { in: ids } },
      data: { status: "active" },
    });
    return NextResponse.json({ ok: true, affected: result.count });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "操作失败" },
      { status: 500 }
    );
  }
}
