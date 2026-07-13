import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SimStatusBreakdown } from "../../app/admin/_components/sim-status-breakdown";
import type { SimStatusBreakdown as SimStatus } from "../../lib/admin-reminder-stats";

const baseStats: SimStatus = {
  total: 50,
  active: 45,
  paused: 5,
  bound: 30,
  unbound: 20,
};

describe("<SimStatusBreakdown />", () => {
  it("渲染 sim 总数", () => {
    render(<SimStatusBreakdown stats={baseStats} />);
    expect(screen.getByText("共 50 个")).toBeInTheDocument();
  });

  it("渲染 活跃 / 暂停 数字", () => {
    render(<SimStatusBreakdown stats={baseStats} />);
    // 45 活跃, 5 暂停
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText(/5 暂停/)).toBeInTheDocument();
  });

  it("渲染 已绑 / 未绑 数字", () => {
    render(<SimStatusBreakdown stats={baseStats} />);
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText(/20 未绑/)).toBeInTheDocument();
  });

  it("活跃率 90% (45/50) → progressbar aria-valuenow=90", () => {
    render(<SimStatusBreakdown stats={baseStats} />);
    const activeBar = screen.getByRole("progressbar", { name: /活跃率/ });
    expect(activeBar).toHaveAttribute("aria-valuenow", "90");
  });

  it("绑定率 60% (30/50) → progressbar aria-valuenow=60", () => {
    render(<SimStatusBreakdown stats={baseStats} />);
    const boundBar = screen.getByRole("progressbar", { name: /绑定率/ });
    expect(boundBar).toHaveAttribute("aria-valuenow", "60");
  });

  it("0 sim 时 → 0%, 进度条宽度 0", () => {
    const zeroStats: SimStatus = { total: 0, active: 0, paused: 0, bound: 0, unbound: 0 };
    render(<SimStatusBreakdown stats={zeroStats} />);
    expect(screen.getByText("共 0 个")).toBeInTheDocument();
    // progressbar 仍然存在,只是 width 0%
    const bars = screen.getAllByRole("progressbar");
    expect(bars.length).toBe(2);
  });

  it("活跃 100% (无暂停) → 不显示 'X 暂停' 数字", () => {
    const fullActive: SimStatus = { total: 30, active: 30, paused: 0, bound: 30, unbound: 0 };
    render(<SimStatusBreakdown stats={fullActive} />);
    // 没有 '0 暂停' 数字(只有 '0 未绑' 之类的也不该出现)
    expect(screen.queryByText(/0 暂停/)).toBeNull();
    expect(screen.queryByText(/0 未绑/)).toBeNull();
  });

  it("hover 进度条显示百分比", () => {
    render(<SimStatusBreakdown stats={baseStats} />);
    // 找 title="活跃 45 / 50 (90%)"
    const activeBar = screen.getByTitle("活跃 45 / 50 (90%)");
    expect(activeBar).toBeInTheDocument();
  });
});
