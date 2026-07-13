// Round 158: /me "本月已推" widget 加近 7 日每日 mini bar
// - 7 个小柱(今天 + 6 天前)
// - 柱高按 max(count) 等比缩放
// - hover tooltip 显示完整日期 + 数量
// - 今天用 indigo-600 深色,其他 indigo-400 浅色

import type { DailySend } from "@/lib/admin-reminder-stats";

const BAR_MAX_HEIGHT = 24; // px

export function MonthDailyChart({ days }: { days: DailySend[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <ul
      className="mt-2 flex items-end gap-1 h-7"
      aria-label="近 7 日每日推送数"
    >
      {days.map((d) => {
        const heightPct = d.count > 0 ? (d.count / max) * 100 : 0;
        const mm = String(d.date.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.date.getUTCDate()).padStart(2, "0");
        const isToday = d.offset === 0;
        return (
          <li
            key={d.offset}
            className="flex-1 h-full flex flex-col items-center justify-end"
            title={`${mm}-${dd} 推送 ${d.count} 条`}
          >
            <div
              className="w-full rounded-sm"
              style={{
                height: `${Math.max(1, (heightPct / 100) * BAR_MAX_HEIGHT)}px`,
                backgroundColor: isToday ? "#4f46e5" : "#a5b4fc",
                minHeight: "1px",
              }}
              aria-label={`${mm}-${dd} 推送 ${d.count} 条`}
            />
          </li>
        );
      })}
    </ul>
  );
}
