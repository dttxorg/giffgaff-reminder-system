import { describe, it, expect } from "vitest";
import { todayLocalISODate } from "../lib/date";

describe("todayLocalISODate", () => {
  it("返回本地时区今天的 yyyy-MM-dd 格式", () => {
    const result = todayLocalISODate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("对于 UTC+8 时区,凌晨 7 点(UTC 昨天 23 点)返回本地今天而非 UTC 昨天", () => {
    // 模拟 UTC+8 时区。Date 内部存 UTC,getTimezoneOffset 在 UTC+8 返回 -480。
    // 我们选一个固定 UTC 时刻:2026-07-09T23:30:00Z (即 UTC+8 的 2026-07-10 07:30)
    // 和另一个:2026-07-08T23:30:00Z (即 UTC+8 的 2026-07-09 07:30)
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;

    Date.prototype.getTimezoneOffset = () => -480; // UTC+8

    try {
      // UTC+8 凌晨 7:30,UTC 是昨天 23:30
      const utcYesterday = new Date("2026-07-08T23:30:00Z");
      expect(todayLocalISODate(utcYesterday)).toBe("2026-07-09");

      // UTC+8 中午 12 点,UTC 是当天 04 点
      const utcNoon = new Date("2026-07-09T04:00:00Z");
      expect(todayLocalISODate(utcNoon)).toBe("2026-07-09");

      // UTC+8 晚上 23 点,UTC 是当天 15 点
      const utcEvening = new Date("2026-07-09T15:00:00Z");
      expect(todayLocalISODate(utcEvening)).toBe("2026-07-09");
    } finally {
      Date.prototype.getTimezoneOffset = originalGetTimezoneOffset;
    }
  });

  it("对于 UTC-5 时区同样正确", () => {
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;

    Date.prototype.getTimezoneOffset = () => 300; // UTC-5

    try {
      // UTC-5 凌晨 2 点,UTC 是当天 07 点
      const utcMorning = new Date("2026-07-09T07:00:00Z");
      expect(todayLocalISODate(utcMorning)).toBe("2026-07-09");

      // UTC-5 晚上 22 点,UTC 是次日 03 点
      const utcNight = new Date("2026-07-10T03:00:00Z");
      expect(todayLocalISODate(utcNight)).toBe("2026-07-09");
    } finally {
      Date.prototype.getTimezoneOffset = originalGetTimezoneOffset;
    }
  });
});

import { formatRelativeTime } from "../lib/date";

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-07-09T12:00:00Z").getTime();

  it("< 1 分钟 → 刚刚", () => {
    const past = new Date(NOW - 30 * 1000); // 30 秒前
    expect(formatRelativeTime(past, NOW)).toBe("刚刚");
  });

  it("刚好 1 分钟前 → 1 分钟前", () => {
    expect(formatRelativeTime(new Date(NOW - 60_000), NOW)).toBe("1 分钟前");
  });

  it("30 分钟前 → 30 分钟前", () => {
    expect(formatRelativeTime(new Date(NOW - 30 * 60_000), NOW)).toBe("30 分钟前");
  });

  it("59 分钟前 → 59 分钟前", () => {
    expect(formatRelativeTime(new Date(NOW - 59 * 60_000), NOW)).toBe("59 分钟前");
  });

  it("1 小时前 → 1 小时前", () => {
    expect(formatRelativeTime(new Date(NOW - 60 * 60_000), NOW)).toBe("1 小时前");
  });

  it("5 小时前 → 5 小时前", () => {
    expect(formatRelativeTime(new Date(NOW - 5 * 60 * 60_000), NOW)).toBe("5 小时前");
  });

  it("23 小时前 → 23 小时前", () => {
    expect(formatRelativeTime(new Date(NOW - 23 * 60 * 60_000), NOW)).toBe("23 小时前");
  });

  it("1 天前 → 1 天前", () => {
    expect(formatRelativeTime(new Date(NOW - 24 * 60 * 60_000), NOW)).toBe("1 天前");
  });

  it("3 天前 → 3 天前", () => {
    expect(formatRelativeTime(new Date(NOW - 3 * 24 * 60 * 60_000), NOW)).toBe("3 天前");
  });

  it("6 天前 → 6 天前", () => {
    expect(formatRelativeTime(new Date(NOW - 6 * 24 * 60 * 60_000), NOW)).toBe("6 天前");
  });

  it("1 周前 → 1 周前", () => {
    expect(formatRelativeTime(new Date(NOW - 7 * 24 * 60 * 60_000), NOW)).toBe("1 周前");
  });

  it("4 周前(28 天)→ 4 周前", () => {
    expect(formatRelativeTime(new Date(NOW - 28 * 24 * 60 * 60_000), NOW)).toBe("4 周前");
  });

  it("35 天 → 1 个月前", () => {
    expect(formatRelativeTime(new Date(NOW - 35 * 24 * 60 * 60_000), NOW)).toBe("1 个月前");
  });

  it("180 天 → 6 个月前", () => {
    expect(formatRelativeTime(new Date(NOW - 180 * 24 * 60 * 60_000), NOW)).toBe("6 个月前");
  });

  it("365 天 → 1 年前", () => {
    expect(formatRelativeTime(new Date(NOW - 365 * 24 * 60 * 60_000), NOW)).toBe("1 年前");
  });

  it("2 年前 → 2 年前", () => {
    expect(formatRelativeTime(new Date(NOW - 2 * 365 * 24 * 60 * 60_000), NOW)).toBe("2 年前");
  });

  it("未来时间 → 刚刚(防 -1 天前 这种怪话)", () => {
    expect(formatRelativeTime(new Date(NOW + 60 * 60_000), NOW)).toBe("刚刚");
  });

  it("支持 string 输入", () => {
    expect(formatRelativeTime(new Date(NOW - 60_000).toISOString(), NOW)).toBe("1 分钟前");
  });

  it("支持 number 输入 now(避免 Date 构造开销)", () => {
    expect(formatRelativeTime(new Date(NOW - 60_000), NOW)).toBe("1 分钟前");
  });
});

import { formatShanghaiDateTime, formatUtcShanghaiDual } from "../lib/date";

describe("formatShanghaiDateTime", () => {
  it("UTC 14:30 → Shanghai 22:30", () => {
    const d = new Date("2025-12-08T14:30:00Z");
    expect(formatShanghaiDateTime(d)).toBe("2025-12-08 22:30");
  });

  it("UTC 16:00 → Shanghai 次日 00:00 (跨天)", () => {
    const d = new Date("2025-12-08T16:00:00Z");
    expect(formatShanghaiDateTime(d)).toBe("2025-12-09 00:00");
  });

  it("UTC 00:30 → Shanghai 08:30 (当天)", () => {
    const d = new Date("2025-12-08T00:30:00Z");
    expect(formatShanghaiDateTime(d)).toBe("2025-12-08 08:30");
  });

  it("接受 ISO 字符串", () => {
    expect(formatShanghaiDateTime("2025-12-08T14:30:00Z")).toBe("2025-12-08 22:30");
  });

  it("分钟 < 10 要补 0", () => {
    const d = new Date("2025-12-08T14:05:00Z");
    expect(formatShanghaiDateTime(d)).toBe("2025-12-08 22:05");
  });
});

describe("formatUtcShanghaiDual", () => {
  it("返回 UTC + 上海时间双显示", () => {
    const d = new Date("2025-12-08T14:30:00Z");
    expect(formatUtcShanghaiDual(d)).toBe("2025-12-08 14:30 UTC · 22:30 (UTC+8)");
  });

  it("跨天时只显示上海时间 HH:MM", () => {
    const d = new Date("2025-12-08T16:00:00Z");
    // UTC: 2025-12-08 16:00, Shanghai: 2025-12-09 00:00 → 00:00
    expect(formatUtcShanghaiDual(d)).toBe("2025-12-08 16:00 UTC · 00:00 (UTC+8)");
  });
});
