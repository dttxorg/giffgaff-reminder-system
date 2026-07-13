// 保号提醒规则：基于 dayOffset（今天 - 激活/上次保号日期）和 hourOfDay 计算 bucket

// 业务全部按 Asia/Shanghai（北京时间，UTC+8）解读"日期"。
// Vercel serverless 跑在 UTC,如果直接用 getUTCFullYear / getUTCHours,
// 北京时间凌晨 0:00-8:00 会把"今天"算成昨天,bucket 窗口也会整体错位。
const SHANGHAI_TZ = "Asia/Shanghai";

/**
 * 把 Date 拆成 Asia/Shanghai 时区的 ymdhms。
 * hourCycle: "h23" 关键:不指定时 midnight 会返回 "24:00",而不是 "00:00"。
 */
export function shanghaiParts(d: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) parts[p.type] = p.value;
  return {
    year: +parts.year,
    month: +parts.month,
    day: +parts.day,
    hour: +parts.hour,
    minute: +parts.minute,
    second: +parts.second,
  };
}

/**
 * 各 dayOffset 对应的当天发送次数(2026-06-21 调整:170-172=1次,173-175=2次,176-178=3次)
 */
export const COUNTS: Record<number, number> = {
  170: 1, 171: 1, 172: 1,
  173: 2, 174: 2, 175: 2,
  176: 3, 177: 3, 178: 3,
  179: 5,
  180: 10,
};

/**
 * 返回当天的发送计划；null 表示当天不应发
 * bucket 从 0 开始，0-indexed
 *
 * @param dayOffset 今天距基准日期的天数（向下取整）
 * @param hourOfDay 0-23 的小时数（Asia/Shanghai）
 */
export function bucketForDay(
  dayOffset: number,
  hourOfDay: number
): { count: number; bucket: number } | null {
  const count = COUNTS[dayOffset];
  if (!count) return null;
  if (hourOfDay < 0 || hourOfDay >= 24) return null;

  // 把 24 小时按 count 等分
  const windowSizeHours = 24 / count;
  const bucket = Math.min(count - 1, Math.floor(hourOfDay / windowSizeHours));
  return { count, bucket };
}


/**
 * 返回下一个 bucket 的开始时间(上海时区)。
 *
 * 算法:
 * - 拿当前 bucket 索引 = Math.floor(hourOfDay / windowSize)
 * - 下一个 bucket = current + 1 (如果 < count)
 * - 今天的下一个 bucket 起点 = 当天 0 时 + (nextBucket * windowSize) 小时
 * - 如果今天所有 bucket 都已过(nextBucket === count) → 返回明天 0 时
 *
 * @param dayOffset 距基准日的天数
 * @param hourOfDay 当前小时(0-23,上海时区)
 * @returns 下次 bucket 开始的 "HH:MM" 字符串(上海),或 null(不在提醒窗口)
 *
 * 用例: /me 提醒窗口 alert 显示"下次推送 HH:MM (X 小时 Y 分后)"
 */
export function nextBucketAt(
  dayOffset: number,
  hourOfDay: number
): string | null {
  const info = bucketForDay(dayOffset, hourOfDay);
  if (!info) return null;
  const { count, bucket } = info;
  const windowSizeHours = 24 / count;

  // 当前 bucket 已经发过/正在发,下一个 = bucket + 1
  // (bucket 索引从 0 开始,所以"今天已发 X 次"对应 bucket=X-1)
  const nextBucket = bucket + 1;

  // 计算 HH:MM 字符串
  let hour: number;
  if (nextBucket < count) {
    // 今天的下一个 bucket
    hour = Math.floor(nextBucket * windowSizeHours);
  } else {
    // 今天的都过完了 → 明天 0:00(下一天的 bucket 0)
    hour = 0;
  }
  const hh = String(hour).padStart(2, "0");
  const mm = "00";
  return `${hh}:${mm}`;
}

/**
 * 返回"距下次 bucket 还有多久"的友好描述。
 *
 * @param now 当前时间
 * @param nextHHMM 下次 bucket 时间(如 "14:00")
 * @returns 如 "3 小时 20 分后" / "25 分后" / "明天 0 点"
 *
 * 简化算法:把"今天的 HH:MM"和"now"对比,得到分钟差。
 * 跨天情况下 nextBucketAt 会返回 "00:00"(表示明天 0 点),此时 diff 加 24h。
 */
export function timeUntilNextBucket(now: Date, nextHHMM: string): string {
  const [hh, mm] = nextHHMM.split(":").map(Number);
  const nowHH = now.getHours();
  const nowMM = now.getMinutes();
  let diffMinutes = (hh - nowHH) * 60 + (mm - nowMM);

  // 跨天(0 点)时,nextHHMM="00:00" 应该是明天 → diff 加 24h
  if (diffMinutes <= 0) {
    // 可能是"已经过了,算明天"
    // 如果是 0:00 + diff <= 0 (说明现在 >= 0:00 但今天 0 点已经过)
    // → 算明天
    diffMinutes += 24 * 60;
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} 分后`;
  }
  const h = Math.floor(diffMinutes / 60);
  const m = diffMinutes % 60;
  if (m === 0) return `${h} 小时后`;
  return `${h} 小时 ${m} 分后`;
}

/**
 * 便捷：根据日期对象计算 dayOffset（按 Asia/Shanghai 时区算"日期差"）
 * @param baseline 激活日期或上次保号日期（业务语义是日期粒度）
 * @param now 当前时间
 */
export function dayOffsetFromBaseline(baseline: Date, now: Date = new Date()): number {
  const b = shanghaiParts(baseline);
  const n = shanghaiParts(now);
  // 用 Date.UTC 把 ymd 当成纯日历日算 diff,忽略时分秒
  const baselineDay = Date.UTC(b.year, b.month - 1, b.day);
  const nowDay = Date.UTC(n.year, n.month - 1, n.day);
  return Math.floor((nowDay - baselineDay) / (1000 * 60 * 60 * 24));
}

/**
 * 检查 dayOffset 是否落在"激活里程碑"上,返回里程碑名;否则 null。
 *
 * 里程碑: 0 / 30 / 100 / 365 / 730 / 1825 / 3650 天
 * (0 = 当天, 30 = 一个月, 100 = 百日, 365 = 一年, 730 = 两年, ...)
 *
 * 业务用例: /me 主页面在里程碑当天显示小庆祝 banner,
 * 增强用户对'系统一直在守护'的感知(不只是数字累加)。
 */
export type Milestone = {
  /** 里程碑天数 */
  days: number;
  /** 中文标签 (e.g. "100 天里程碑") */
  label: string;
  /** emoji-free 简短描述 (e.g. "百日里程碑") */
  short: string;
};

const MILESTONES: Milestone[] = [
  { days: 0, label: "已激活", short: "欢迎使用" },
  { days: 30, label: "30 天里程碑", short: "一个月" },
  { days: 100, label: "100 天里程碑", short: "百日" },
  { days: 365, label: "1 周年里程碑", short: "一年" },
  { days: 730, label: "2 周年里程碑", short: "两年" },
  { days: 1825, label: "5 周年里程碑", short: "五年" },
];

export function getMilestone(dayOffset: number): Milestone | null {
  return MILESTONES.find((m) => m.days === dayOffset) ?? null;
}



/**
 * Round 168: 算"激活至今"周年里程碑进度
 *
 * 业务用例: /me 顶部 widget 显示"激活 X 年 Y 天,距 1 周年还差 N 天"
 * 让用户知道长期使用的里程碑(1/2/3... 周年)
 */
export interface AnniversaryProgress {
  /** 完整周年数 (0/1/2/...) */
  years: number;
  /** 距下一个周年还差多少天 */
  daysToNextAnniversary: number;
  /** 当前激活总天数(用于显示 X 年 Y 天) */
  totalDays: number;
  /** 距下个周年还差多少天 (跟 daysToNextAnniversary 相同,语义化命名) */
  daysLeft: number;
}

export function getAnniversaryProgress(
  dayOffset: number
): AnniversaryProgress {
  const years = Math.floor(dayOffset / 365);
  const daysToNextAnniversary = 365 - (dayOffset % 365);
  return {
    years,
    daysToNextAnniversary,
    totalDays: dayOffset,
    daysLeft: daysToNextAnniversary,
  };
}

/**
 * Round 155: 返回下一个还没到达的里程碑 + 距它还有多少天。
 *
 * 业务用例: /me 在没命中里程碑时,显示"距 100 天还差 23 天"激励用户继续使用。
 * 命中里程碑当天 getMilestone() 优先显示庆祝 banner,
 * 这里只负责"下一个"目标。
 */
export function getNextMilestone(
  dayOffset: number
): { milestone: Milestone; daysLeft: number } | null {
  const next = MILESTONES.find((m) => m.days > dayOffset);
  if (!next) return null; // 已超过最大里程碑(1825 天)
  return { milestone: next, daysLeft: next.days - dayOffset };
}

/**
 * 检查给定 dayOffset 是否在提醒窗口内（170-180）
 */
export function isInReminderWindow(dayOffset: number): boolean {
  return dayOffset >= 170 && dayOffset <= 180;
}
