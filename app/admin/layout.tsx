import { getAdminSession } from "@/lib/session";
import { AdminSidebar } from "./_components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await getAdminSession();
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {isAdmin && <AdminSidebar />}
      <div className="flex-1 bg-slate-50">{children}</div>
    </div>
  );
}
