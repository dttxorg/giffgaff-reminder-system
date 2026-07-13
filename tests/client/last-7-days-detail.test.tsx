import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Last7DaysDetail, type Last7DaysDay } from "../../app/admin/_components/last-7-days-detail";

const sampleDays: Last7DaysDay[] = [
  { offset: 6, date: new Date(Date.UTC(2026, 6, 7)), count: 2 },
  { offset: 5, date: new Date(Date.UTC(2026, 6, 8)), count: 5 },
  { offset: 4, date: new Date(Date.UTC(2026, 6, 9)), count: 0 },
  { offset: 3, date: new Date(Date.UTC(2026, 6, 10)), count: 1 },
  { offset: 2, date: new Date(Date.UTC(2026, 6, 11)), count: 3 },
  { offset: 1, date: new Date(Date.UTC(2026, 6, 12)), count: 4 },
  { offset: 0, date: new Date(Date.UTC(2026, 6, 13)), count: 6 },
];

describe("<Last7DaysDetail />", () => {
  it("渲染 7 个日期块", () => {
    render(<Last7DaysDetail days={sampleDays} />);
    expect(screen.getAllByRole("listitem").length).toBe(7);
  });

  it("今天 (offset=0) 标 '今' + indigo 高亮", () => {
    render(<Last7DaysDetail days={sampleDays} />);
    const todayLi = screen.getByTitle(/2026-07-13.*发送 6 条/);
    expect(todayLi).toHaveTextContent("今");
    expect(todayLi.className).toContain("text-indigo-700");
  });

  it("其他日期显示 MM-DD", () => {
    render(<Last7DaysDetail days={sampleDays} />);
    expect(screen.getByText("07-07")).toBeInTheDocument();
    expect(screen.getByText("07-12")).toBeInTheDocument();
  });

  it("hover tooltip 显示完整日期 + 数量", () => {
    render(<Last7DaysDetail days={sampleDays} />);
    expect(
      screen.getByTitle(/2026-07-09.*发送 0 条/)
    ).toBeInTheDocument();
    expect(
      screen.getByTitle(/2026-07-10.*发送 1 条/)
    ).toBeInTheDocument();
  });

  it("count=0 的日期仍显示(透明展示没活动)", () => {
    render(<Last7DaysDetail days={sampleDays} />);
    // 找 07-09 (offset=4, count=0)
    const li = screen.getByTitle(/2026-07-09/);
    expect(li).toHaveTextContent("0");
  });

  it("今天的 count 用 indigo 数字(继承父级 font-semibold)", () => {
    render(<Last7DaysDetail days={sampleDays} />);
    // 找 7 个 li,最后一个是今天
    const items = screen.getAllByRole("listitem");
    const today = items[items.length - 1];
    expect(today.className).toContain("font-semibold");
  });
});
