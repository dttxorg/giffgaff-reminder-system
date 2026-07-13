import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthDailyChart } from "../../app/me/_components/month-daily-chart";
import type { DailySend } from "../../lib/admin-reminder-stats";

const sampleDays: DailySend[] = Array.from({ length: 7 }, (_, i) => ({
  offset: 6 - i,
  date: new Date(Date.UTC(2026, 6, 7 + i)), // 2026-07-07 ~ 2026-07-13
  count: i % 3, // 0,1,2 循环
}));

describe("<MonthDailyChart />", () => {
  it("渲染 7 个柱", () => {
    render(<MonthDailyChart days={sampleDays} />);
    expect(screen.getAllByRole("listitem").length).toBe(7);
  });

  it("每柱 aria-label 显示 MM-DD 推送 N 条", () => {
    render(<MonthDailyChart days={sampleDays} />);
    // offset=0 (今天, i=6, count=6%3=0)
    expect(screen.getByLabelText("07-13 推送 0 条")).toBeInTheDocument();
    // offset=2 (i=4, count=4%3=1)
    expect(screen.getByLabelText("07-11 推送 1 条")).toBeInTheDocument();
  });

  it("hover tooltip 显示完整日期 + 数量", () => {
    render(<MonthDailyChart days={sampleDays} />);
    expect(screen.getByTitle(/07-12 推送 2 条/)).toBeInTheDocument();
  });

  it("今天 (offset=0) 用 indigo-600 深色", () => {
    render(<MonthDailyChart days={sampleDays} />);
    const todayBar = screen.getByLabelText("07-13 推送 0 条");
    expect(todayBar.getAttribute("style")).toContain("rgb(79, 70, 229)");
  });

  it("其他天用 indigo-400 浅色", () => {
    render(<MonthDailyChart days={sampleDays} />);
    const otherBar = screen.getByLabelText("07-11 推送 1 条");
    expect(otherBar.getAttribute("style")).toContain("rgb(165, 180, 252)");
  });

  it("aria-label 包含 '近 7 日每日推送数'", () => {
    render(<MonthDailyChart days={sampleDays} />);
    expect(screen.getByLabelText("近 7 日每日推送数")).toBeInTheDocument();
  });

  it("count=0 的柱仍渲染(最小 1px 可见)", () => {
    render(<MonthDailyChart days={sampleDays} />);
    // 找 count=0 的柱
    const zeroBar = screen.getByLabelText("07-13 推送 0 条");
    expect(zeroBar).toBeInTheDocument();
  });
});

describe("<MonthDailyChart /> 点击跳转 (round 177)", () => {
  it("每根柱是 Link,跳 /me/pushes?from=&to= 当天", () => {
    render(<MonthDailyChart days={sampleDays} />);
    // 找 offset=2 (i=5, 7+5=12, 2026-07-12) 的柱 (count=2)
    const link = screen.getByRole("link", { name: "07-12 推送 2 条" });
    expect(link.getAttribute("href")).toBe("/me/pushes?from=2026-07-12&to=2026-07-12");
  });

  it("今天的柱 (offset=0) href 是今天日期", () => {
    render(<MonthDailyChart days={sampleDays} />);
    // 找 07-13 (今天, i=6, count=0)
    const link = screen.getByRole("link", { name: "07-13 推送 0 条" });
    expect(link.getAttribute("href")).toBe("/me/pushes?from=2026-07-13&to=2026-07-13");
  });

  it("hover 提示 '(点击查看当日推送)'", () => {
    render(<MonthDailyChart days={sampleDays} />);
    expect(screen.getAllByTitle(/点击查看当日推送/).length).toBe(7);
  });
});
