"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";
import { MobileAdminNav } from "./mobile-admin-nav";
import { Breadcrumb } from "./breadcrumb";
import { SkipToContent } from "../../_components/skip-to-content";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SkipToContent />
      {!isLoginPage && (
        <>
          <MobileAdminNav />
          <AdminSidebar />
        </>
      )}
      <main id="main-content" className="flex-1 bg-slate-50">
        {!isLoginPage && (
          <div className="mx-auto max-w-6xl px-6 py-2 sm:px-8">
            <Breadcrumb />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
