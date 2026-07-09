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
