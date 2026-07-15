export default function AdminLoading() {
  return (
    <div
      className="p-6 sm:p-8"
      role="status"
      aria-label="正在加载管理页面"
    >
      <span className="sr-only">正在加载管理页面</span>
      <div className="mb-6 h-8 w-28 animate-pulse rounded bg-slate-200" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="min-h-28 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-3 w-24 max-w-full animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
