import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InWindowSims } from "../../app/admin/_components/in-window-sims";
import type { InWindowSim } from "../../lib/admin-reminder-stats";

const baseSims: InWindowSim[] = [
  { simId: 1, phoneNumber: "07724215611", dayOffset: 180, daysLeft: 0 },
  { simId: 2, phoneNumber: "07724215622", dayOffset: 175, daysLeft: 5 },
  { simId: 3, phoneNumber: "07724215633", dayOffset: 170, daysLeft: 10 },
];

describe("<InWindowSims />", () => {
  it("渲染 sim 列表(手机号 + 剩余天数)", () => {
    render(<InWindowSims sims={baseSims} />);
    expect(screen.getByText("07724215611")).toBeInTheDocument();
    expect(screen.getByText("剩 0 天")).toBeInTheDocument();
    expect(screen.getByText("07724215622")).toBeInTheDocument();
    expect(screen.getByText("剩 5 天")).toBeInTheDocument();
  });

  it("空数组 → '暂无 sim 在提醒窗口'", () => {
    render(<InWindowSims sims={[]} />);
    expect(screen.getByText("✓ 暂无 sim 在提醒窗口")).toBeInTheDocument();
  });

  it("剩 0 天 (最后一天) → rose 配色 + 粗体", () => {
    render(<InWindowSims sims={baseSims} />);
    const urgentSpan = screen.getByText("剩 0 天");
    expect(urgentSpan.className).toContain("text-rose-700");
    expect(urgentSpan.className).toContain("font-semibold");
  });

  it("剩 1-5 天 (临近) → orange 配色", () => {
    render(<InWindowSims sims={baseSims} />);
    const nearSpan = screen.getByText("剩 5 天");
    expect(nearSpan.className).toContain("text-orange-700");
  });

  it("剩 6+ 天 (刚进窗口) → amber 配色", () => {
    render(<InWindowSims sims={baseSims} />);
    const newSpan = screen.getByText("剩 10 天");
    expect(newSpan.className).toContain("text-amber-700");
  });

  it("手机号链接到 /admin/sims/[id]", () => {
    render(<InWindowSims sims={baseSims} />);
    const link = screen.getByRole("link", { name: "07724215611" });
    expect(link).toHaveAttribute("href", "/admin/sims/1");
  });

  it("标题显示 N 个并说明按号码规则", () => {
    render(<InWindowSims sims={baseSims} />);
    expect(screen.getByText("3 个 · 按号码规则")).toBeInTheDocument();
  });
});
