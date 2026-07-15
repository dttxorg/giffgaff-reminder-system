export default function SettingsLoading() {
  return (
    <div
      className="mx-auto max-w-md px-4 py-8 sm:py-12"
      role="status"
      aria-label="正在加载设置页"
    >
      <span className="sr-only">正在加载设置页</span>

      <div className="mb-5 h-4 w-28 animate-pulse rounded bg-slate-100" />
      <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-3 h-4 w-52 animate-pulse rounded bg-slate-100" />

      <div className="mt-6 h-6 w-36 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-2" aria-hidden="true">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-11 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
        <div className="mt-5 h-4 w-28 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-11 animate-pulse rounded-lg bg-slate-100" />
        <div className="mt-5 h-12 animate-pulse rounded-lg bg-indigo-100" />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-11 animate-pulse rounded-lg bg-slate-100" />
      </div>

      <div className="mt-6 h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
