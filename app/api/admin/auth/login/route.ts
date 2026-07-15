import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth";
import { ensureDefaultAdmin } from "@/lib/admin-bootstrap";
import { createAdminSession } from "@/lib/session";

const BodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
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

  // 首次访问时创建默认管理员
  const admin = await ensureDefaultAdmin();
  if (admin.username !== parsed.data.username) {
    return NextResponse.json({ ok: false, error: "账号或密码错误" }, { status: 401 });
  }
  const ok = await verifyPassword(parsed.data.password, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "账号或密码错误" }, { status: 401 });
  }

  await createAdminSession();
  return NextResponse.json({ ok: true, redirect: "/admin" });
}
