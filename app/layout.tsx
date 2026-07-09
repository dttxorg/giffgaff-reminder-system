import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Link from "next/link";
import { UserNav, UserNavFallback } from "./_components/user-nav";

export const metadata: Metadata = {
  title: "Giffgaff 保号提醒",
  description: "Giffgaff SIM 卡保号提醒服务",
};

/**
 * 根 layout。
 *
 * G5 优化: 不再在 layout 顶层 await getCurrentUser(),而是用 <Suspense>
 * 包裹 UserNav。让页面的主体内容(连 /login / /help 这种不需要用户态的)
 * 不被这一查阻塞 — DB 慢的话用户能更早看到页面内容。
 *
 * 视觉: header 右侧 nav 区域在 DB 返回前显示 UserNavFallback 占位(同高度,
 * 避免抖动),DB 返回后无缝替换为真实导航。
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-indigo-600">
              <span className="inline-block w-8 h-8 rounded-lg bg-indigo-600 text-white text-center leading-8">
                G
              </span>
              <span>Giffgaff 保号提醒</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Suspense fallback={<UserNavFallback />}>
                <UserNav />
              </Suspense>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white/60 py-4 text-center text-xs text-slate-500">
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-3">
            <span>Giffgaff 保号提醒 · V1</span>
            <span className="text-slate-300">·</span>
            <Link
              href="/admin/login"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              管理入口
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
