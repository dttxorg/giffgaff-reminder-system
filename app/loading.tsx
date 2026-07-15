export default function GlobalLoading() {
  return (
    <div
      className="route-loading-shell mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12"
      role="status"
      aria-label="正在加载页面"
    >
      <span className="sr-only">正在加载页面</span>

      <div
        className="route-loading-bar fixed inset-x-0 top-[57px] z-40 h-0.5 overflow-hidden bg-indigo-100"
        aria-hidden="true"
      />

      <div className="route-loading-content mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="h-3 w-20 animate-pulse rounded-full bg-indigo-100" />
              <div className="mt-3 h-7 w-48 max-w-full animate-pulse rounded-lg bg-slate-200" />
            </div>
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-100" />
          </div>

          <div className="mt-7 space-y-3" aria-hidden="true">
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
