// 本地时区日期工具

/**
 * 返回用户本地时区今天的 yyyy-MM-dd。
 *
 * 注意:`new Date().toISOString().slice(0, 10)` 给的是 UTC 日期,
 * 在非 UTC 时区下会与本地"今天"差一天。修正方法是把 Date 按
 * timezoneOffset 偏移后取 ISO,等价于本地日历日。
 *
 * 例子:UTC+8 早上 7 点 (UTC 昨天 23 点),本函数返回本地"今天";
 *      new Date().toISOString().slice(0, 10) 返回 UTC 昨天。
 */
export function todayLocalISODate(now: Date = new Date()): string {
  const d = new Date(now.getTime());
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
