// 管理员页面鉴权
import { redirect } from "next/navigation";
import { getAdminSession } from "./session";

export async function requireAdmin() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) redirect("/admin/login");
}
