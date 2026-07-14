import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PausedSimStats } from "../../app/admin/_components/paused-sim-stats";

const baseStats = {
  currentlyPaused: 5,
  recentlyPaused: 2,
  recentlyCreated: 10,
};

describe("<PausedSimStats />", () => {
  it("渲染 '近 7 日暂停' 标题", () => {
    render(<PausedSimStats stats={baseStats} />);
    expect(screen.getByText("近 7 日暂停")).toBeInTheDocument();
  });

  it("显示 currently paused 数量", () => {
    render(<PausedSimStats stats={baseStats} />);
    expect(screen.getByText(/当前 paused/)).toBeInTheDocument();
  expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("显示 recentlyPaused / recentlyCreated 比例", () => {
    render(<PausedSimStats stats={baseStats} />);
    expect(screen.getByText(/2 \/ 10 \(20%\)/)).toBeInTheDocument();
  });

  it("recentlyPaused > 0 时用 rose-700 配色", () => {
    const { container } = render(<PausedSimStats stats={baseStats} />);
    const ratioSpan = container.querySelector(".text-rose-700");
    expect(ratioSpan).not.toBeNull();
  });

  it("recentlyPaused = 0 时用 slate 配色 (无 rose)", () => {
    const statsNoPaused = { currentlyPaused: 0, recentlyPaused: 0, recentlyCreated: 10 };
    const { container } = render(<PausedSimStats stats={statsNoPaused} />);
    const ratioSpan = container.querySelector(".text-rose-700");
    expect(ratioSpan).toBeNull();
  });

  it("整块是 Link,跳 /admin/sims?status=paused", () => {
    const { container } = render(<PausedSimStats stats={baseStats} />);
    const link = container.querySelector('a[href="/admin/sims?status=paused"]');
    expect(link).not.toBeNull();
  });

  it("recentlyCreated = 0 时比例 0% (不除零)", () => {
    const zero = { currentlyPaused: 0, recentlyPaused: 0, recentlyCreated: 0 };
    const { container } = render(<PausedSimStats stats={zero} />);
    expect(container.textContent).toContain("0 / 0 (0%)");
  });
});
