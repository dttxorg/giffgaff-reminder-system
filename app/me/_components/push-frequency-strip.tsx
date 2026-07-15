/**
 * Round 223: /me "近 7 日推送频率"迷你条形图
 *
 * 设计:7 个小柱(对应 7 天),高度 = 当天推送数 / 当周峰值
 * 颜色按 dayOffset 区分(便于看 170/180 窗口的频率跳变):
 *  - dayOffset < 170:slate(静默期,理论上没推送)
 *  - 170-178:amber(轻度/中度/高度提醒)
 *  - 179:orange
 *  - 180:rose
 *  - >180:slate-400(过期,系统停了)
 */
export interface PushFrequencyStripProps {
  data: Array<{ date: Date; count: number; dayOffset: number }>;
}

export function PushFrequencyStrip({ data }: PushFrequencyStripProps) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900">近 7 日推送频率</h3>
        <span className="text-[10px] text-slate-400">
          总 {data.reduce((s, d) => s + d.count, 0)} 条
        </span>
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {data.map((d, i) => {
          const heightPct = d.count === 0 ? 4 : (d.count / max) * 100;
          const color = colorFor(d.dayOffset);
          const labelDate = `${d.date.getMonth() + 1}/${d.date.getDate()}`;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 min-w-0"
              title={`${labelDate} · 第 ${d.dayOffset} 天 · ${d.count} 条`}
            >
              <span className="text-[10px] text-slate-500 font-medium tabular-nums">
                {d.count > 0 ? d.count : ""}
              </span>
              <div
                className={`w-full ${color} rounded-t transition-all`}
                style={{ height: `${heightPct}%`, minHeight: "2px" }}
                aria-label={`${labelDate} ${d.count} 条`}
              />
              <span className="text-[9px] text-slate-400 tabular-nums">
                {labelDate}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-slate-400 text-center">
        颜色 = 当天 dayOffset(灰:静默/过期 / 黄:提醒窗口 / 红:临近截止)
      </div>
    </div>
  );
}

function colorFor(dayOffset: number): string {
  if (dayOffset < 170) return "bg-slate-300";
  if (dayOffset <= 178) return "bg-amber-400";
  if (dayOffset === 179) return "bg-orange-500";
  if (dayOffset === 180) return "bg-rose-500";
  return "bg-slate-400";
}
