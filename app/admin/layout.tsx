import Link from "next/link";
import { getAdminSession } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await getAdminSession();
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {isAdmin && (
        <aside className="md:w-56 bg-slate-900 text-slate-100 md:min-h-screen md:sticky md:top-0 md:h-screen flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <div className="font-semibold">管理后台</div>
            <div className="text-xs text-slate-400 mt-0.5">Giffgaff Reminder</div>
          </div>
          <nav className="p-2 space-y-0.5 text-sm flex-1">
            <AdminLink href="/admin" label="仪表盘" />
            <AdminLink href="/admin/sims" label="号码管理" />
            <AdminLink href="/admin/users" label="用户" />
            <AdminLink href="/admin/reminders" label="提醒日志" />
            <AdminLink href="/admin/settings" label="文案设置" />
          </nav>
          <div className="p-2 border-t border-slate-800">
            <form action="/api/admin/auth/logout" method="post">
              <button
                type="submit"
                className="w-full text-left px-3 py-2 rounded text-slate-400 hover:bg-slate-800 hover:text-white text-sm"
              >
                退出登录
              </button>
            </form>
          </div>
        </aside>
      )}
      <div className="flex-1 bg-slate-50">{children}</div>
    </div>
  );
}

function AdminLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded text-slate-300 hover:bg-slate-800 hover:text-white"
    >
      {label}
    </Link>
  );
}
