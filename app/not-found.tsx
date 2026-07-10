import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-4xl mb-2 text-slate-400">404</div>
        <h1 className="text-xl font-bold mb-2 text-slate-900">页面不存在</h1>
        <p className="text-slate-600 text-sm mb-5">
          您访问的页面不存在,可能链接已失效。
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center text-sm">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            返回首页
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            登录
          </Link>
        </div>
      </div>
    </div>
  );
}
