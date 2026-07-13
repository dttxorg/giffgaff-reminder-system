"use client";

// Round 132: 共享 Error Fallback UI
// - 给 Next.js error.tsx 用(必须是 client component)
// - 显示友好错误信息 + "重试" + "返回首页" 两个 CTA
// - 不暴露 stack trace 给最终用户(开发环境用 Next.js 自带的 error overlay)

import Link from "next/link";
import { useEffect } from "react";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** 返回首页的链接,默认 "/" */
  homeHref?: string;
  /** 错误范围描述(显示在副标),默认 "加载时出现错误" */
  scope?: string;
}

export function ErrorFallback({
  error,
  reset,
  homeHref = "/",
  scope = "加载时",
}: ErrorFallbackProps) {
  useEffect(() => {
    // 上报错误到控制台,方便开发排查
    // 生产环境可以接 Sentry / Vercel Analytics 等
    console.error(`[ErrorBoundary] ${scope}发生错误:`, error);
  }, [error, scope]);

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        {/* 警告 icon (复用 /me warning banner 风格) */}
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-rose-600"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-xl font-bold mb-2 text-slate-900">
          {scope}出了点问题
        </h1>
        <p className="text-slate-600 text-sm mb-5">
          系统遇到意外错误,刷新或返回首页重试。如果多次出现,请联系管理员。
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            重试
          </button>
          <Link
            href={homeHref}
            className="px-5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            返回首页
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-slate-400 mt-4 font-mono">
            错误 ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
