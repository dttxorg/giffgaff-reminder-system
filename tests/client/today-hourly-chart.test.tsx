import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodayHourlyChart } from "../../app/me/_components/today-hourly-chart";
import type { HourlySend } from "../../lib/admin-reminder-stats";

const sampleHours: HourlySend[] = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  count: hour % 4 === 0 ? 2 : 0, // 0/4/8/12/16/20 时各 2 条
}));

describe("<TodayHourlyChart />", () => {
  it("渲染 24 个小时柱", () => {
    render(<TodayHourlyChart hours={sampleHours} currentHour={14} />);
    // 24 个 div (每个柱)
    const chart = screen.getByLabelText("今日按小时推送分布");
    expect(chart.querySelectorAll("div[class*='flex-1']").length).toBe(24);
  });

  it("hover tooltip 显示 HH:00 - N 条", () => {
    render(<TodayHourlyChart hours={sampleHours} currentHour={14} />);
    // hour=0 count=2 → title="00:00 - 2 条"
    expect(screen.getByTitle("00:00 - 2 条")).toBeInTheDocument();
    expect(screen.getByTitle("04:00 - 2 条")).toBeInTheDocument();
  });

  it("当前小时用 indigo-600 (深色)", () => {
    render(<TodayHourlyChart hours={sampleHours} currentHour={4} />);
    // hour=4 的柱 style 包含 rgb(79, 70, 229)
    const currentBar = screen.getByLabelText("04:00 2 条");
    expect(currentBar.getAttribute("style")).toContain("rgb(79, 70, 229)");
  });

  it("其他小时用 indigo-400 (浅色)", () => {
    render(<TodayHourlyChart hours={sampleHours} currentHour={4} />);
    // hour=0 (非当前) 浅色
    const otherBar = screen.getByLabelText("00:00 2 条");
    expect(otherBar.getAttribute("style")).toContain("rgb(165, 180, 252)");
  });

  it("0 推送时显示 '今日暂无推送' 文字", () => {
    const zeroHours: HourlySend[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
    }));
    render(<TodayHourlyChart hours={zeroHours} currentHour={14} />);
    expect(screen.getByText("今日暂无推送")).toBeInTheDocument();
  });

  it("底部时间刻度显示 0/6/12/18/23", () => {
    render(<TodayHourlyChart hours={sampleHours} currentHour={14} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
  });

  it("aria-label 包含 '今日按小时推送分布'", () => {
    render(<TodayHourlyChart hours={sampleHours} currentHour={14} />);
    expect(screen.getByLabelText("今日按小时推送分布")).toBeInTheDocument();
  });
});
