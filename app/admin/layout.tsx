import { getAdminSession } from "@/lib/session";
import { AdminSidebar } from "./_components/admin-sidebar";
import { Breadcrumb } from "./_components/breadcrumb";
import { SkipToContent } from "../_components/skip-to-content";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await getAdminSession();
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <SkipToContent />
      {isAdmin && <AdminSidebar />}
      <main id="main-content" className="flex-1 bg-slate-50"><div className="max-w-6xl mx-auto px-6 sm:px-8 py-2"><Breadcrumb /></div>{children}</main>
    </div>
  );
}
