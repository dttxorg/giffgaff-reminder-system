// Round 156: /admin 仪表盘"近 90 日每日发送"mini bar (超紧凑版)
// - 90 个超小柱(每周累积视觉密度)
// - 柱高按 max(count) 等比缩放
// - hover tooltip 显示完整日期 + 数量
// - 今天是 indigo-600,其他 indigo-300 (比 30 日更浅一档,避免视觉过重)

import Link from "next/link";
import type { DailySend } from "@/lib/admin-reminder-stats";

const BAR_MAX_HEIGHT = 28; // px

export function Last90DaysSends({ days }: { days: DailySend[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <ul className="mt-2 flex items-end gap-px h-8" aria-label="近 90 日每日发送数">
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
                height: `${Math.max(1, (heightPct / 100) * BAR_MAX_HEIGHT)}px`,
                backgroundColor: isToday ? "#4f46e5" : "#c7d2fe",
                minHeight: "1px",
              }}
              aria-label={`${isoDate} ${d.count} 条`}
            />
          </li>
        );
      })}
    </ul>
  );
}
