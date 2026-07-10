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

/**
 * 相对时间格式化 — 把 Date 转成 "3 分钟前" / "2 小时前" / "5 天前" 等。
 *
 * 设计:
 * - 阈值: < 1 min → "刚刚"; < 1h → "N 分钟前"; < 1d → "N 小时前";
 *   < 7d → "N 天前"; < 30d → "N 周前"; < 1y → "N 个月前"; ≥ 1y → "N 年前"
 * - 未来时间(参数 > now)统一显示 "刚刚",避免 "1 小时后" 这种怪话
 * - 不传 now 时用 Date.now(),传则用于测试
 * - locale: 输出中文,简洁明了
 *
 * 注意:实际接 Date 时差 = now - pastDate(毫秒),正值表示过去
 */
export function formatRelativeTime(past: Date | string, now: Date | number = Date.now()): string {
  const pastMs = typeof past === "string" ? new Date(past).getTime() : past.getTime();
  const nowMs = typeof now === "number" ? now : now.getTime();
  const diffMs = nowMs - pastMs;

  // 未来时间(包含很近的 0 / 负数)< 1 分钟都算"刚刚"
  if (diffMs < 60_000) return "刚刚";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} 周前`; // 5 周内按周

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;

  const years = Math.floor(days / 365);
  return `${years} 年前`;
}
