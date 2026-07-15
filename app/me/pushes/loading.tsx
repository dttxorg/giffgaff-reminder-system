export default function PushHistoryLoading() {
  return (
    <div
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
      role="status"
      aria-label="正在加载推送历史"
    >
      <span className="sr-only">正在加载推送历史</span>

      <div className="mb-5 h-4 w-28 animate-pulse rounded bg-slate-100" />
      <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-200" />

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white"
          />
        ))}
      </div>

      <div className="mt-4 h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
      <div className="mt-5 flex flex-wrap gap-2" aria-hidden="true">
        {[64, 72, 64, 80, 72, 88].map((width, index) => (
          <div
            key={`${width}-${index}`}
            className="h-8 animate-pulse rounded-lg bg-slate-100"
            style={{ width }}
          />
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="flex items-center justify-between px-4 py-4">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="border-t border-slate-100 px-4 py-4">
              <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
