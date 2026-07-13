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

describe("<TodayChannelStats /> 渠道行点击跳转 (round 145)", () => {
  it("整行是 Link,点击跳到 /admin/reminders?channel=X", () => {
    render(<TodayChannelStats stats={baseStats} />);
    // Server酱 渠道行应跳到 channel=serverchan
    const serverchanLink = screen.getByRole("link", { name: /Server酱/ });
    expect(serverchanLink).toHaveAttribute("href", "/admin/reminders?channel=serverchan");
  });

  it("Bark 渠道行跳到 channel=bark", () => {
    render(<TodayChannelStats stats={baseStats} />);
    const barkLink = screen.getByRole("link", { name: /Bark/ });
    expect(barkLink).toHaveAttribute("href", "/admin/reminders?channel=bark");
  });

  it("pushplus (0 推送) 仍可点击(去查为什么没活动)", () => {
    render(<TodayChannelStats stats={baseStats} />);
    const pushplusLink = screen.getByRole("link", { name: /pushplus/ });
    expect(pushplusLink).toHaveAttribute("href", "/admin/reminders?channel=pushplus");
  });
});

describe("<TodayChannelStats /> 排序 (round 173)", () => {
  const sortableStats = [
    { channel: "serverchan" as const, total: 10, success: 10, failed: 0 },
    { channel: "bark" as const, total: 5, success: 3, failed: 2 },
    { channel: "pushplus" as const, total: 3, success: 3, failed: 0 },
    { channel: "telegram" as const, total: 1, success: 0, failed: 1 },
  ];

  it("默认按失败率倒序 (Telegram 100% → Bark 40% → pushplus 0% → Server酱 0%)", () => {
    render(<TodayChannelStats stats={sortableStats} />);
    // skip '查看详细日志' link (index 0)
    const links = screen.getAllByRole("link").slice(1);
    // Telegram (100% 失败率) 应排第一
    expect(links[0].textContent).toContain("Telegram");
    // Bark (40%) 第二
    expect(links[1].textContent).toContain("Bark");
  });

  it("sortBy='total' 按总推送数倒序 (Server酱 10 → Bark 5 → pushplus 3 → Telegram 1)", () => {
    render(<TodayChannelStats stats={sortableStats} sortBy="total" />);
    // skip '查看详细日志' link (index 0)
    const links = screen.getAllByRole("link").slice(1);
    expect(links[0].textContent).toContain("Server酱");
    expect(links[1].textContent).toContain("Bark");
    expect(links[2].textContent).toContain("pushplus");
    expect(links[3].textContent).toContain("Telegram");
  });
});
