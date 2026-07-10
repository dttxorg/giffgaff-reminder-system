import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="p-6 sm:p-8 max-w-md">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-4xl mb-2 text-slate-400">404</div>
        <h1 className="text-xl font-bold mb-2 text-slate-900">页面不存在</h1>
        <p className="text-slate-600 text-sm mb-5">
          您访问的管理页面不存在,可能链接已失效或没有权限。
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center text-sm">
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            返回仪表盘
          </Link>
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
