import Link from "next/link";

export default function MeNotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-4xl mb-2 text-slate-400">404</div>
        <h1 className="text-xl font-bold mb-2 text-slate-900">页面不存在</h1>
        <p className="text-slate-600 text-sm mb-5">
          您访问的用户中心页面不存在,可能链接已失效。
        </p>
        <Link
          href="/me"
          className="inline-block px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          返回用户中心
        </Link>
      </div>
    </div>
  );
}
