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

/** 返回 Asia/Shanghai 自然日的 yyyy-MM-dd，供服务端业务日期校验使用。 */
export function todayShanghaiISODate(now: Date = new Date()): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/** 严格解析 yyyy-MM-dd；拒绝 2 月 30 日等会被 Date 自动进位的日期。 */
export function parseISOCalendarDate(input: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
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

/**
 * 把 Date / ISO 字符串格式化成上海时区(UTC+8)的"yyyy-MM-dd HH:mm"。
 * 用途:admin / cron 日志在 server 端统一显示上海时间,而不是用户本地时区。
 *
 * 注:Vercel/Neon 的 Date.now() 给的是 UTC,数据库存的也是 UTC。
 * Admin 看上海时间方便排错(国内业务)。
 */
export function formatShanghaiDateTime(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  // UTC 时间 + 8 小时 = 上海时间
  const shanghaiMs = d.getTime() + 8 * 60 * 60 * 1000;
  const sh = new Date(shanghaiMs);
  const yyyy = sh.getUTCFullYear();
  const mm = String(sh.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(sh.getUTCDate()).padStart(2, "0");
  const HH = String(sh.getUTCHours()).padStart(2, "0");
  const MM = String(sh.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}`;
}

/**
 * 紧凑版:同时给出 UTC 和上海时间,空格分隔,适合表格副标。
 * 例:"2025-12-08 14:30 UTC · 22:30 (UTC+8)"
 */
export function formatUtcShanghaiDual(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const utc = d.toISOString().replace("T", " ").slice(0, 16);
  const sh = formatShanghaiDateTime(d).slice(11); // 只取 HH:MM
  return `${utc} UTC · ${sh} (UTC+8)`;
}

/**
 * 距离某日 N 天(用于 "上次保号后 5 天" 这种简略中文)
 * - 0 天 → "今天"
 * - 1 天 → "昨天"
 * - N 天 → "N 天前"
 * - 未来时间(数据异常)→ 仍然 "今天"
 */
export function formatTimeGap(since: Date, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - since.getTime()) / 86400000);
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  return `${days} 天前`;
}
