// Round 153: /me "今日已推" 按小时分布 mini chart
// - 24 个小柱 (0-23 时)
// - 柱高按 max(count) 等比缩放
// - hover tooltip 显示 "HH 时 - N 条"
// - 当前小时用 indigo-600 深色,其他 indigo-400 浅色

import type { HourlySend } from "@/lib/admin-reminder-stats";

const BAR_MAX_HEIGHT = 24; // px

export function TodayHourlyChart({
  hours,
  currentHour,
}: {
  hours: HourlySend[];
  /** 当前小时(上海时区),用于高亮当前小时 */
  currentHour: number;
}) {
  const max = Math.max(1, ...hours.map((h) => h.count));
  const total = hours.reduce((sum, h) => sum + h.count, 0);
  return (
    <div className="mt-2">
      <div className="flex items-end gap-px h-7" aria-label="今日按小时推送分布">
        {hours.map((h) => {
          const heightPct = h.count > 0 ? (h.count / max) * 100 : 0;
          const isCurrent = h.hour === currentHour;
          return (
            <div
              key={h.hour}
              className="flex-1 h-full flex flex-col items-center justify-end"
              title={`${String(h.hour).padStart(2, "0")}:00 - ${h.count} 条`}
            >
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${Math.max(1, (heightPct / 100) * BAR_MAX_HEIGHT)}px`,
                  backgroundColor: isCurrent ? "#4f46e5" : "#a5b4fc",
                  minHeight: "1px",
                }}
                aria-label={`${String(h.hour).padStart(2, "0")}:00 ${h.count} 条`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
      {total === 0 && (
        <p className="text-xs text-slate-400 mt-1 text-center">今日暂无推送</p>
      )}
    </div>
  );
}
