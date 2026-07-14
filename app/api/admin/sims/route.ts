import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
import { generatePortToken } from "@/lib/port-token";

const BodySchema = z.object({
  phoneNumber: z.string().min(6),
  activatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["active", "paused"]).optional(),
  // A 场景：管理员录 sim 时一并给客户设置初始密码
  // 管理员会把这个密码转告客户，客户首次登录后可去 /me/settings 自行修改
  initialPassword: z.string().min(8, "初始密码至少 8 位"),
});

/**
 * POST /api/admin/sims
 * A 场景：管理员录 sim + 同步创建 user（含初始密码）
 *
 * 业务流：
 * 1. 创建 sim
 * 2. 创建 user: username 直接 = sim.phoneNumber（管理员录的号，客户继续用手机号登录,无感迁移）
 *    passwordHash 哈希初始密码
 * 3. 客户访问 /login → 输手机号 + 初始密码 → 进入 /me
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
    const passwordHash = await hashPassword(parsed.data.initialPassword);
    const created = await prisma.$transaction(async (tx) => {
      // 新 sim 在创建时就生成 portToken,这样首批推送就使用安全 URL
      const sim = await tx.sim.create({
        data: {
          phoneNumber: phone,
          portToken: generatePortToken(),
          activatedAt,
          status: parsed.data.status || "active",
        },
      });
      await tx.user.create({
        data: {
          // username 直接 = 手机号：客户继续用原手机号登录
          // (跟迁移策略一致,管理员录的号也是老用户路径)
          username: phone,
          simId: sim.id,
          channel: "serverchan",
          channelKey: "",
          passwordHash,
        },
      });
      return sim;
    });
    return NextResponse.json({ ok: true, sim: created, created: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "创建失败" },
      { status: 500 }
    );
  }
}
