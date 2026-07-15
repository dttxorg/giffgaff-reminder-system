import { describe, expect, it } from "vitest";
import {
  getPushHistoryWeekStart,
  summarizePushHistoryWeek,
} from "../lib/push-history-stats";

const now = new Date("2026-07-15T04:00:00.000Z"); // 上海时间 7 月 15 日 12:00
const baseline = new Date("2026-01-01T04:00:00.000Z");

describe("push-history-stats", () => {
  it("近 7 日从上海当天零点向前覆盖 7 个日历日", () => {
    expect(getPushHistoryWeekStart(now).toISOString()).toBe(
      "2026-07-08T16:00:00.000Z"
    );
  });

  it("单次记录集合可汇总为 7 天，且不会把上海午夜前后的记录放错日", () => {
    const result = summarizePushHistoryWeek(
      [
        { sentAt: new Date("2026-07-14T15:59:59.000Z") }, // 上海 7 月 14 日 23:59
        { sentAt: new Date("2026-07-14T16:00:00.000Z") }, // 上海 7 月 15 日 00:00
        { sentAt: new Date("2026-07-15T03:00:00.000Z") },
      ],
      baseline,
      now
    );

    expect(result).toHaveLength(7);
    expect(result.at(-2)?.count).toBe(1);
    expect(result.at(-1)?.count).toBe(2);
    expect(result.at(-1)?.date.toISOString()).toBe("2026-07-15T04:00:00.000Z");
    expect(result.at(-1)?.dayOffset).toBe(195);
  });
});
