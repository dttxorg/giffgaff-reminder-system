import Link from "next/link";

// Round 146: /admin 仪表盘"近 7 日详细"列表
// - 在 sparkline 下面显示 7 个日期块
// - 今天标 "今" + indigo 高亮,其他显示 MM-DD
// - hover tooltip 显示完整日期 + 数量
// - Round 147: 数字点击 → 跳 /admin/reminders?from=&to= 看当日详细日志

export interface Last7DaysDay {
  /** 距今天的天数(0 = 今天, 6 = 6 天前) */
  offset: number;
  /** 当天 0 点 UTC 的 Date 对象 */
  date: Date;
  /** 当天发送数 */
  count: number;
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export function Last7DaysDetail({ days }: { days: Last7DaysDay[] }) {
  return (
    <ul className="mt-3 grid grid-cols-7 gap-2 text-center">
      {days.map((d) => {
        const mm = String(d.date.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.date.getUTCDate()).padStart(2, "0");
        const isToday = d.offset === 0;
        const weekday = WEEKDAY_LABELS[d.date.getUTCDay()];
        const isoDate = d.date.toISOString().slice(0, 10);
        return (
          <li
            key={d.offset}
            className={
              "text-xs " +
              (isToday ? "font-semibold text-indigo-700" : "text-slate-500")
            }
            title={`${isoDate} (周${weekday}) 发送 ${d.count} 条`}
          >
            <div>{isToday ? "今" : `${mm}-${dd}`}</div>
            <Link
              href={`/admin/reminders?from=${isoDate}&to=${isoDate}`}
              className="block text-slate-900 text-sm font-medium mt-0.5 hover:text-indigo-600 hover:underline"
            >
              {d.count}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
