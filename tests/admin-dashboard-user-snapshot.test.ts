import { describe, expect, it } from "vitest";
import { summarizeAdminUserSnapshot } from "../lib/admin-dashboard-user-snapshot";

const now = new Date("2026-07-15T04:00:00.000Z");

describe("admin dashboard user snapshot", () => {
  it("还原用户总数和上海自然日新增趋势", () => {
    const result = summarizeAdminUserSnapshot(
      {
        totalCount: 42,
        dailyCounts: [1, 0, 2, 0, 0, 3, 4],
      },
      now
    );

    expect(result.userCount).toBe(42);
    expect(result.newUsersLast7Days.total).toBe(10);
    expect(result.newUsersLast7Days.daily).toHaveLength(7);
    expect(result.newUsersLast7Days.daily[0]).toEqual({
      date: new Date("2026-07-09T04:00:00.000Z"),
      count: 1,
    });
    expect(result.newUsersLast7Days.daily.at(-1)?.count).toBe(4);
  });

  it("不足 7 个计数时自动补零", () => {
    const result = summarizeAdminUserSnapshot(
      { totalCount: 0, dailyCounts: [] },
      now
    );

    expect(result.newUsersLast7Days.daily.every((day) => day.count === 0)).toBe(
      true
    );
  });
});
