import Link from "next/link";

export default function HelpNotFound() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-4xl mb-2 text-slate-400">404</div>
        <h1 className="text-xl font-bold mb-2 text-slate-900">教程页面不存在</h1>
        <p className="text-slate-600 text-sm mb-5">
          您访问的教程页面不存在。
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center text-sm">
          <Link
            href="/help"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            查看所有渠道
          </Link>
          <Link
            href="/me"
            className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            返回用户中心
          </Link>
        </div>
      </div>
    </article>
  );
}
