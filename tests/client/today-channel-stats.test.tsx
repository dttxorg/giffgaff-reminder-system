import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodayChannelStats } from "../../app/admin/_components/today-channel-stats";
import type { ChannelStat } from "../../lib/admin-reminder-stats";

const baseStats: ChannelStat[] = [
  { channel: "serverchan", total: 10, success: 10, failed: 0 },
  { channel: "bark", total: 5, success: 3, failed: 2 },
  { channel: "pushplus", total: 0, success: 0, failed: 0 },
  { channel: "telegram", total: 3, success: 3, failed: 0 },
];

describe("<TodayChannelStats />", () => {
  it("渲染 4 渠道(中文 label)", () => {
    render(<TodayChannelStats stats={baseStats} />);
    expect(screen.getByText("Server酱")).toBeInTheDocument();
    expect(screen.getByText("Bark")).toBeInTheDocument();
    expect(screen.getByText("pushplus")).toBeInTheDocument();
    expect(screen.getByText("Telegram")).toBeInTheDocument();
  });

  it("成功渠道显示 'N 成功 · 合计 M'", () => {
    render(<TodayChannelStats stats={baseStats} />);
    expect(screen.getByText(/10 成功/)).toBeInTheDocument();
    expect(screen.getByText(/合计 10/)).toBeInTheDocument();
  });

  it("有失败时显示 'N 失败' 红色高亮", () => {
    render(<TodayChannelStats stats={baseStats} />);
    // 找包含 "2 失败" 的元素(Bark 渠道),不看 3 成功(可能多渠道命中)
    expect(screen.getByText(/2 失败/)).toBeInTheDocument();
  });

  it("0 推送的渠道显示 '— 今日无活动'", () => {
    render(<TodayChannelStats stats={baseStats} />);
    expect(screen.getByText("— 今日无活动")).toBeInTheDocument();
  });

  it("全部成功 → 链接到 /admin/reminders 可见", () => {
    render(<TodayChannelStats stats={baseStats} />);
    const link = screen.getByRole("link", { name: /查看详细日志/ });
    expect(link).toHaveAttribute("href", "/admin/reminders");
  });

  it("全 0 推送 → 不显示 '合计' 文本", () => {
    const allZero: ChannelStat[] = baseStats.map((s) => ({
      ...s,
      total: 0,
      success: 0,
      failed: 0,
    }));
    render(<TodayChannelStats stats={allZero} />);
    expect(screen.queryByText(/合计/)).toBeNull();
    // 4 个渠道都应显示 "— 今日无活动"
    expect(screen.getAllByText("— 今日无活动").length).toBe(4);
  });

  it("单一渠道完全失败 → 整行用 rose 配色", () => {
    const allFailed: ChannelStat[] = [
      { channel: "bark", total: 4, success: 0, failed: 4 },
    ];
    render(<TodayChannelStats stats={allFailed} />);
    // 0 成功不应出现
    expect(screen.queryByText(/0 成功/)).toBeNull();
    expect(screen.getByText(/4 失败/)).toBeInTheDocument();
  });
});
