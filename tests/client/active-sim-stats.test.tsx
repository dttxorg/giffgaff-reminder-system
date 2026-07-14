import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActiveSimStats } from "../../app/admin/_components/active-sim-stats";

const baseStats = {
  currentlyActive: 45,
  recentlyActivated: 8,
  recentlyCreated: 10,
};

describe("<ActiveSimStats />", () => {
  it("渲染 '近 7 日激活' 标题", () => {
    render(<ActiveSimStats stats={baseStats} />);
    expect(screen.getByText("近 7 日激活")).toBeInTheDocument();
  });

  it("显示 currently active 数量", () => {
    render(<ActiveSimStats stats={baseStats} />);
    expect(screen.getByText(/当前 active/)).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
  });

  it("显示 recentlyActivated / recentlyCreated 比例", () => {
    render(<ActiveSimStats stats={baseStats} />);
    expect(screen.getByText(/8 \/ 10 \(80%\)/)).toBeInTheDocument();
  });

  it("recentlyActivated > 0 时用 emerald-700 配色", () => {
    const { container } = render(<ActiveSimStats stats={baseStats} />);
    const emeraldSpan = container.querySelector(".text-emerald-700");
    expect(emeraldSpan).not.toBeNull();
  });

  it("recentlyActivated = 0 时用 slate 配色 (无 emerald)", () => {
    const statsNoActive = { currentlyActive: 0, recentlyActivated: 0, recentlyCreated: 10 };
    const { container } = render(<ActiveSimStats stats={statsNoActive} />);
    const emeraldSpan = container.querySelector(".text-emerald-700");
    expect(emeraldSpan).toBeNull();
  });

  it("整块是 Link,跳 /admin/sims?status=active", () => {
    const { container } = render(<ActiveSimStats stats={baseStats} />);
    const link = container.querySelector('a[href="/admin/sims?status=active"]');
    expect(link).not.toBeNull();
  });

  it("recentlyCreated = 0 时比例 0% (不除零)", () => {
    const zero = { currentlyActive: 0, recentlyActivated: 0, recentlyCreated: 0 };
    const { container } = render(<ActiveSimStats stats={zero} />);
    expect(container.textContent).toContain("0 / 0 (0%)");
  });
});
