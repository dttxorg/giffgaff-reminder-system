import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/session";

export async function POST(request: Request) {
  await destroyAdminSession();
  // 原生 form 提交后回到登录页，不把管理员留在 JSON 响应页面。
  return NextResponse.redirect(new URL("/admin/login", request.url), 303);
}
