import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Last7DaysChannelStats } from "../../app/admin/_components/last-7-days-channel-stats";
import type { Channel7DayStat } from "../../lib/admin-reminder-stats";

const baseStats: Channel7DayStat[] = [
  { channel: "serverchan", total: 100, success: 98, failed: 2, failRate: 2 },
  { channel: "bark", total: 50, success: 45, failed: 5, failRate: 10 },
  { channel: "pushplus", total: 0, success: 0, failed: 0, failRate: 0 },
  { channel: "telegram", total: 30, success: 30, failed: 0, failRate: 0 },
];

describe("<Last7DaysChannelStats />", () => {
  it("渲染 4 渠道(中文 label)", () => {
    render(<Last7DaysChannelStats stats={baseStats} />);
    expect(screen.getByText("Server酱")).toBeInTheDocument();
    expect(screen.getByText("Bark")).toBeInTheDocument();
    expect(screen.getByText("pushplus")).toBeInTheDocument();
    expect(screen.getByText("Telegram")).toBeInTheDocument();
  });

  it("Server酱 (2% 失败率, ≤ 5%) → emerald", () => {
    render(<Last7DaysChannelStats stats={baseStats} />);
    const failRateEl = screen.getByText(/失败率 2%/);
    expect(failRateEl.className).toContain("text-emerald-700");
  });

  it("Bark (10% 失败率, > 5%) → rose", () => {
    render(<Last7DaysChannelStats stats={baseStats} />);
    const failRateEl = screen.getByText(/失败率 10%/);
    expect(failRateEl.className).toContain("text-rose-700");
  });

  it("Telegram (0 失败) → 失败率 0% 不显示 rose 配色", () => {
    render(<Last7DaysChannelStats stats={baseStats} />);
    const failRateEl = screen.getByText(/失败率 0%/);
    expect(failRateEl.className).toContain("text-slate-400");
  });

  it("pushplus (0 推送) → '— 7 天无活动'", () => {
    render(<Last7DaysChannelStats stats={baseStats} />);
    expect(screen.getByText("— 7 天无活动")).toBeInTheDocument();
  });

  it("整行是 Link,跳 /admin/reminders?channel=X", () => {
    render(<Last7DaysChannelStats stats={baseStats} />);
    const serverchanLink = screen.getByRole("link", { name: /Server酱/ });
    expect(serverchanLink).toHaveAttribute(
      "href",
      "/admin/reminders?channel=serverchan"
    );
  });

  it("显示'合计 N · 失败率 N%'", () => {
    render(<Last7DaysChannelStats stats={baseStats} />);
    expect(screen.getByText(/合计 100/)).toBeInTheDocument();
    expect(screen.getByText(/合计 50/)).toBeInTheDocument();
  });
});
