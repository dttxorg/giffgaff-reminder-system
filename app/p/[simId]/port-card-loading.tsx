export function PortCardLoading() {
  return (
    <div
      className="mx-auto max-w-md px-4 py-8 sm:py-12"
      role="status"
      aria-label="正在加载保号信息"
    >
      <span className="sr-only">正在加载保号信息</span>
      <div className="mx-auto mb-3 h-5 w-52 animate-pulse rounded bg-slate-100" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-56 max-w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-6 h-11 animate-pulse rounded-lg bg-slate-100" />
        <div className="mt-4 h-11 animate-pulse rounded-lg bg-indigo-100" />
      </div>
    </div>
  );
}
