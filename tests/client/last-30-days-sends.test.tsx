import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Last30DaysSends } from "../../app/admin/_components/last-30-days-sends";
import type { DailySend } from "../../lib/admin-reminder-stats";

const sampleDays: DailySend[] = Array.from({ length: 30 }, (_, i) => ({
  offset: 29 - i,
  date: new Date(Date.UTC(2026, 6, 1 + i)),
  count: i % 5, // 0, 1, 2, 3, 4 循环,让高度有变化
}));

describe("<Last30DaysSends />", () => {
  it("渲染 30 个柱", () => {
    render(<Last30DaysSends days={sampleDays} />);
    // 30 个 li 元素(每个 li 包含 1 个 Link 柱)
    expect(screen.getAllByRole("listitem").length).toBe(30);
  });

  it("每个柱是 Link,跳 /admin/reminders?from=&to= 当天", () => {
    render(<Last30DaysSends days={sampleDays} />);
    // 找 offset=0 (今天, count=4) 的柱
    const todayLink = screen.getByRole("link", { name: /2026-07-30 4 条/ });
    expect(todayLink).toHaveAttribute(
      "href",
      "/admin/reminders?from=2026-07-30&to=2026-07-30"
    );
  });

  it("count=0 的柱仍渲染(最小高度 2px,可见但小)", () => {
    render(<Last30DaysSends days={sampleDays} />);
    // offset=29 (最远一天, count=0) 应该有 link,即使 count=0
    const link = screen.getByRole("link", { name: /2026-07-01 0 条/ });
    expect(link).toBeInTheDocument();
  });

  it("今天的柱用 indigo-600 (深色),其他用 indigo-400 (浅色)", () => {
    render(<Last30DaysSends days={sampleDays} />);
    // 找今天 (offset=0) 的 link,style 包含 #4f46e5 (indigo-600)
    const todayLink = screen.getByRole("link", { name: /2026-07-30 4 条/ });
    expect(todayLink.getAttribute("style")).toContain("rgb(79, 70, 229)");

    // 找非今天的 link
    const otherLink = screen.getByRole("link", { name: /2026-07-29/ });
    expect(otherLink.getAttribute("style")).toContain("rgb(165, 180, 252)");
  });

  it("hover tooltip 显示完整日期 + 数量 (li title)", () => {
    render(<Last30DaysSends days={sampleDays} />);
    expect(screen.getByTitle("2026-07-18 发送 2 条")).toBeInTheDocument();
  });

  it("空数组 → 0 个柱", () => {
    render(<Last30DaysSends days={[]} />);
    expect(screen.queryAllByRole("listitem").length).toBe(0);
  });
});
