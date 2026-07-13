import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopActiveSims } from "../../app/admin/_components/top-active-sims";
import type { TopActiveSim } from "../../lib/admin-reminder-stats";

const baseSims: TopActiveSim[] = [
  { simId: 1, phoneNumber: "07724215611", failedCount: 12 },
  { simId: 2, phoneNumber: "07724215622", failedCount: 7 },
  { simId: 3, phoneNumber: "07724215633", failedCount: 3 },
];

describe("<TopActiveSims />", () => {
  it("渲染 sim 列表(手机号 + 推送次数)", () => {
    render(<TopActiveSims sims={baseSims} />);
    expect(screen.getByText("07724215611")).toBeInTheDocument();
    expect(screen.getByText("12 次推送")).toBeInTheDocument();
  });

  it("空数组 → '✓ 7 天无推送'", () => {
    render(<TopActiveSims sims={[]} />);
    expect(screen.getByText("✓ 7 天无推送")).toBeInTheDocument();
  });

  it("手机号链接到 /admin/sims/[id]", () => {
    render(<TopActiveSims sims={baseSims} />);
    const link = screen.getByRole("link", { name: "07724215611" });
    expect(link).toHaveAttribute("href", "/admin/sims/1");
  });

  it("推送次数链接到 /admin/reminders?simId=X (跟 top failing 一致)", () => {
    render(<TopActiveSims sims={baseSims} />);
    const link = screen.getByRole("link", { name: "12 次推送" });
    expect(link).toHaveAttribute("href", "/admin/reminders?simId=1");
  });

  it("其他 sim 同样跳自己的 simId", () => {
    render(<TopActiveSims sims={baseSims} />);
    const link = screen.getByRole("link", { name: "7 次推送" });
    expect(link).toHaveAttribute("href", "/admin/reminders?simId=2");
  });

  it("标题显示 top N(N=sims.length)", () => {
    render(<TopActiveSims sims={baseSims} />);
    expect(screen.getByText(/7 日推送 top 3/)).toBeInTheDocument();
  });

  it("空 sims 时 top N 仍显示 5 (默认上限)", () => {
    render(<TopActiveSims sims={[]} />);
    expect(screen.getByText(/7 日推送 top 5/)).toBeInTheDocument();
  });

  it("'查看所有日志' 链接到 /admin/reminders", () => {
    render(<TopActiveSims sims={baseSims} />);
    const link = screen.getByRole("link", { name: /查看所有日志/ });
    expect(link).toHaveAttribute("href", "/admin/reminders");
  });
});

describe("<TopActiveSims /> 自定义 days (round 163)", () => {
  it("days=90 时标题显示 '90 日推送 top N'", () => {
    render(<TopActiveSims sims={baseSims} days={90} />);
    expect(screen.getByText(/90 日推送 top 3/)).toBeInTheDocument();
  });

  it("days=30 时标题显示 '30 日推送 top N'", () => {
    render(<TopActiveSims sims={baseSims} days={30} />);
    expect(screen.getByText(/30 日推送 top 3/)).toBeInTheDocument();
  });

  it("默认 (不传 days) 仍是 '7 日推送'", () => {
    render(<TopActiveSims sims={baseSims} />);
    expect(screen.getByText(/7 日推送 top 3/)).toBeInTheDocument();
  });
});
