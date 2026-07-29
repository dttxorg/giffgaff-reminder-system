import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { UserNav } from "./_components/user-nav";
import { SkipToContent } from "./_components/skip-to-content";

export const metadata: Metadata = {
  title: "SIM 保号提醒",
  description: "Giffgaff、CTExcel SIM 卡保号提醒服务",
};

/**
 * 根 layout。
 *
 * 根布局不读取 Cookie / DB，让首页、帮助页等公共页面可静态缓存。
 * UserNav 水合后通过私有轻量接口补齐登录态。
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900">
        <SkipToContent />
        <header className="site-header border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="site-header-inner max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link
              href="/"
              className="site-brand flex min-w-0 items-center gap-2 text-lg font-semibold text-indigo-600"
            >
              <span className="inline-block w-8 h-8 rounded-lg bg-indigo-600 text-white text-center leading-8">
                G
              </span>
              <span className="whitespace-nowrap">
                SIM 保号提醒
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <UserNav />
            </nav>
          </div>
        </header>
        <main id="main-content" className="flex-1">{children}</main>
        <footer className="site-footer border-t border-slate-200 bg-white/60 py-4 text-center text-xs text-slate-500">
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-3">
            <span>Giffgaff · CTExcel 保号提醒</span>
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
