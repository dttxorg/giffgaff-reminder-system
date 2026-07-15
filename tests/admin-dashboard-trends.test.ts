import { describe, expect, it } from "vitest";

import { getShanghaiDayStart, summarizeAdminSendTrends } from "../lib/admin-dashboard-trends";

const now = new Date("2026-07-15T04:00:00.000Z"); // 上海 7 月 15 日 12:00

describe("admin-dashboard-trends", () => {
  it("使用上海零点作为趋势边界", () => {
    expect(getShanghaiDayStart(now).toISOString()).toBe(
      "2026-07-14T16:00:00.000Z"
    );
  });

  it("一次汇总同时生成 7 / 30 / 90 日趋势", () => {
    const trends = summarizeAdminSendTrends(
      [
        { sentAt: new Date("2026-07-14T15:59:59.000Z") },
        { sentAt: new Date("2026-07-14T16:00:00.000Z") },
        { sentAt: new Date("2026-07-15T03:00:00.000Z") },
      ],
      now
    );

    expect(trends.last7DaysData).toHaveLength(7);
    expect(trends.last30DaysSends).toHaveLength(30);
    expect(trends.last90DaysSends).toHaveLength(90);
    expect(trends.last90DaysSends.at(-2)?.count).toBe(1);
    expect(trends.last90DaysSends.at(-1)?.count).toBe(2);
  });
});
