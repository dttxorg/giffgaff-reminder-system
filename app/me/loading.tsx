export default function MeLoading() {
  return (
    <div
      className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
      role="status"
      aria-label="正在加载号码管理页"
    >
      <span className="sr-only">正在加载号码管理页</span>

      <div className="mb-6 flex items-center gap-3">
        <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,28rem)] lg:justify-center">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-11 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="divide-y divide-slate-100">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex min-h-[76px] items-center justify-between px-4 py-3">
                <div className="space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 h-7 w-44 animate-pulse rounded bg-slate-200" />
            <div className="mt-5 h-2 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
            <div className="mt-5 h-28 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
