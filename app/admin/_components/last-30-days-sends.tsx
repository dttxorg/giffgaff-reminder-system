// Round 149: /admin 仪表盘"近 30 日每日发送"mini bar
// - 30 个等宽小柱(每天 1 个)
// - 柱高按 max(count) 等比缩放
// - hover tooltip 显示完整日期 + 数量
// - 整体更紧凑(比 Last7DaysDetail 的 7 块窄)

import Link from "next/link";
import type { DailySend } from "@/lib/admin-reminder-stats";

const BAR_MAX_HEIGHT = 36; // px

export function Last30DaysSends({ days }: { days: DailySend[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <ul className="mt-3 flex items-end gap-0.5 h-10" aria-label="近 30 日每日发送数">
      {days.map((d) => {
        const heightPct = d.count > 0 ? (d.count / max) * 100 : 0;
        const isoDate = d.date.toISOString().slice(0, 10);
        const isToday = d.offset === 0;
        return (
          <li
            key={d.offset}
            className="flex-1 h-full flex flex-col items-center justify-end"
            title={`${isoDate} 发送 ${d.count} 条`}
          >
            <Link
              href={`/admin/reminders?from=${isoDate}&to=${isoDate}`}
              className="block w-full rounded-sm hover:opacity-80 transition-opacity"
              style={{
                height: `${Math.max(2, (heightPct / 100) * BAR_MAX_HEIGHT)}px`,
                backgroundColor: isToday ? "#4f46e5" : "#a5b4fc",
                minHeight: "2px",
              }}
              aria-label={`${isoDate} ${d.count} 条`}
            />
          </li>
        );
      })}
    </ul>
  );
}
