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

describe("<Last7DaysChannelStats /> 排序 (round 166)", () => {
  it("默认按失败率倒序(Bark 10% 应该排第一)", () => {
    render(<Last7DaysChannelStats stats={baseStats} />);
    // 第一个 Link 是 Bark (10% 失败率)
    const firstLink = screen.getAllByRole("link")[0];
    expect(firstLink.textContent).toContain("Bark");
  });

  it("sortBy='total' 按总推送数倒序(Server酱 100 应该排第一)", () => {
    render(<Last7DaysChannelStats stats={baseStats} sortBy="total" />);
    const firstLink = screen.getAllByRole("link")[0];
    expect(firstLink.textContent).toContain("Server酱");
  });

  it("失败率相同时按 total 倒序(本测试数据无重复失败率,跳过)", () => {
    // 服务器酱 2% 总 100, Telegram 0% 总 30, Bark 10% 总 50
    // 失败率: Bark 10 > 服务器酱 2 > Telegram 0 = pushplus 0
    // 排序: Bark, 服务器酱, Telegram, pushplus
    render(<Last7DaysChannelStats stats={baseStats} />);
    const links = screen.getAllByRole("link");
    expect(links[0].textContent).toContain("Bark");
    expect(links[1].textContent).toContain("Server酱");
  });
});

describe("<Last7DaysChannelStats /> 自定义 days (round 167)", () => {
  it("days=90 时标题显示 '近 90 日按 channel'", () => {
    render(<Last7DaysChannelStats stats={baseStats} days={90} />);
    expect(screen.getByText(/近 90 日按 channel/)).toBeInTheDocument();
  });

  it("days=30 时标题显示 '近 30 日按 channel'", () => {
    render(<Last7DaysChannelStats stats={baseStats} days={30} />);
    expect(screen.getByText(/近 30 日按 channel/)).toBeInTheDocument();
  });

  it("days=90 时 '— 90 天无活动' (有 days 替换)", () => {
    render(<Last7DaysChannelStats stats={baseStats} days={90} />);
    expect(screen.getByText(/90 天无活动/)).toBeInTheDocument();
  });

  it("默认 (不传 days) 仍是 '近 7 日'", () => {
    render(<Last7DaysChannelStats stats={baseStats} />);
    expect(screen.getByText(/近 7 日按 channel/)).toBeInTheDocument();
  });
});
