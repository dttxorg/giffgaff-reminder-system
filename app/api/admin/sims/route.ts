import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

const BodySchema = z.object({
  phoneNumber: z.string().min(6),
  activatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["active", "paused"]).optional(),
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
  const phone = parsed.data.phoneNumber.replace(/\D/g, "");
  const [y, m, d] = parsed.data.activatedAt.split("-").map(Number);
  const activatedAt = new Date(Date.UTC(y, m - 1, d));

  try {
    const existing = await prisma.sim.findUnique({ where: { phoneNumber: phone } });
    if (existing) {
      const updated = await prisma.sim.update({
        where: { id: existing.id },
        data: { activatedAt, ...(parsed.data.status ? { status: parsed.data.status } : {}) },
      });
      return NextResponse.json({ ok: true, sim: updated, created: false });
    }
    const created = await prisma.sim.create({
      data: {
        phoneNumber: phone,
        activatedAt,
        status: parsed.data.status || "active",
      },
    });
    return NextResponse.json({ ok: true, sim: created, created: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "创建失败" },
      { status: 500 }
    );
  }
}
