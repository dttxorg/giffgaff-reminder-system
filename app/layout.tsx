import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Giffgaff 报号提醒",
  description: "Giffgaff SIM 卡保号提醒服务",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-indigo-600">
              <span className="inline-block w-8 h-8 rounded-lg bg-indigo-600 text-white text-center leading-8">
                G
              </span>
              <span>Giffgaff 报号提醒</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {user ? (
                <>
                  <Link
                    href="/me"
                    className="px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    用户中心
                  </Link>
                  <form action="/api/auth/logout" method="post">
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-600"
                    >
                      退出
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    登录
                  </Link>
                  <Link
                    href="/admin/login"
                    className="px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-500"
                  >
                    管理
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white/60 py-4 text-center text-xs text-slate-500">
          <div className="max-w-5xl mx-auto px-4">
            Giffgaff 报号提醒 · V1 · 有问题找管理员
          </div>
        </footer>
      </body>
    </html>
  );
}
