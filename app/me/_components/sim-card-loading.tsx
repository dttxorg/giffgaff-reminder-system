export function SimCardLoading() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-label="正在加载号码详情"
    >
      <span className="sr-only">正在加载号码详情</span>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-8 w-16 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="mt-5 h-2 animate-pulse rounded-full bg-slate-100" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="mt-5 h-24 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}
