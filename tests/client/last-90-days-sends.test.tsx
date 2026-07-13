import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Last90DaysSends } from "../../app/admin/_components/last-90-days-sends";
import type { DailySend } from "../../lib/admin-reminder-stats";

const sampleDays: DailySend[] = Array.from({ length: 90 }, (_, i) => ({
  offset: 89 - i,
  date: new Date(Date.UTC(2026, 3, 1 + i)), // 2026-04-01 起步
  count: i % 7, // 0-6 循环
}));

describe("<Last90DaysSends />", () => {
  it("渲染 90 个超小柱", () => {
    render(<Last90DaysSends days={sampleDays} />);
    expect(screen.getAllByRole("listitem").length).toBe(90);
  });

  it("每柱是 Link,跳 /admin/reminders?from=&to= 当天", () => {
    render(<Last90DaysSends days={sampleDays} />);
    // 找今天 (offset=0, count=0, 2026-06-30) 的柱
    const todayLink = screen.getByRole("link", { name: /2026-06-29 5 条/ });
    expect(todayLink).toHaveAttribute(
      "href",
      "/admin/reminders?from=2026-06-29&to=2026-06-29"
    );
  });

  it("今天的柱用 indigo-600 (深色),其他 indigo-300 (浅色)", () => {
    render(<Last90DaysSends days={sampleDays} />);
    const todayLink = screen.getByRole("link", { name: /2026-06-29/ });
    expect(todayLink.getAttribute("style")).toContain("rgb(79, 70, 229)");

    // 找非今天:2026-04-01 (offset=89, count=89%7=5)
    const otherLink = screen.getByRole("link", { name: /2026-04-06/ });
    expect(otherLink.getAttribute("style")).toContain("rgb(199, 210, 254)");
  });

  it("hover tooltip 显示完整日期 + 数量 (li title)", () => {
    render(<Last90DaysSends days={sampleDays} />);
    // 2026-04-15 (offset=75, count=75%7=5)
    expect(screen.getByTitle("2026-04-13 发送 5 条")).toBeInTheDocument();
  });

  it("count=0 的柱仍渲染(最小 1px)", () => {
    render(<Last90DaysSends days={sampleDays} />);
    // count=0 的柱应存在 (有 aria-label)
    const zeroLink = screen.getByRole("link", { name: /2026-04-29 0 条/ });
    expect(zeroLink).toBeInTheDocument();
  });

  it("空数组 → 0 个柱", () => {
    render(<Last90DaysSends days={[]} />);
    expect(screen.queryAllByRole("listitem").length).toBe(0);
  });
});
