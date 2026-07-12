import Link from "next/link";
import { NotFoundBackButton } from "./_components/not-found-back-button";

export default function AdminNotFound() {
  return (
    <div className="p-6 sm:p-8 max-w-md">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        {/* SVG icon: 简化版指南针,表达"找不着路" */}
        <div className="mx-auto mb-4 w-16 h-16 text-slate-300" aria-hidden="true">
          <svg
            width={64}
            height={64}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        </div>
        <div className="text-4xl mb-2 text-slate-400 font-mono">404</div>
        <h1 className="text-xl font-bold mb-2 text-slate-900">页面不存在</h1>
        <p className="text-slate-600 text-sm mb-4">
          您访问的管理页面不存在,可能链接已失效或没有权限。
        </p>
        <div className="text-xs text-slate-500 mb-5 text-left bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="font-medium text-slate-700 mb-1">链接可能因以下原因失效:</div>
          <ul className="list-disc list-inside space-y-0.5">
            <li>号码 / 用户 / 卡密 已被删除</li>
            <li>URL 手敲错(注意大小写)</li>
            <li>权限变更(联系超级管理员)</li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center text-sm">
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            返回仪表盘
          </Link>
          <NotFoundBackButton />
          <Link
            href="/admin/sims"
            className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            号码列表
          </Link>
        </div>
      </div>
    </div>
  );
}