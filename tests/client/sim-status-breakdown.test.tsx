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

describe("<SimStatusBreakdown /> 近 7 日新增 (round 157)", () => {
  const newSimsLast7Days = {
    total: 5,
    daily: [
      { date: new Date(Date.UTC(2026, 6, 7)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 8)), count: 1 },
      { date: new Date(Date.UTC(2026, 6, 9)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 10)), count: 2 },
      { date: new Date(Date.UTC(2026, 6, 11)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 12)), count: 1 },
      { date: new Date(Date.UTC(2026, 6, 13)), count: 1 },
    ],
  };

  it("渲染 '近 7 日新增 N 个'", () => {
    render(
      <SimStatusBreakdown
        stats={baseStats}
        newSimsLast7Days={newSimsLast7Days}
      />
    );
    expect(screen.getByText("近 7 日新增 sim")).toBeInTheDocument();
    // 5 个,数字在 strong 标签里
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("7 天无新增时显示 '7 天无新增'", () => {
    const emptyNew = { total: 0, daily: newSimsLast7Days.daily.map((d) => ({ ...d, count: 0 })) };
    render(
      <SimStatusBreakdown stats={baseStats} newSimsLast7Days={emptyNew} />
    );
    expect(screen.getByText("7 天无新增")).toBeInTheDocument();
  });

  it("渲染 7 个新增 sim 柱", () => {
    render(
      <SimStatusBreakdown
        stats={baseStats}
        newSimsLast7Days={newSimsLast7Days}
      />
    );
    // 找 7-13 每天的柱
    expect(screen.getByLabelText("07-13 新增 1")).toBeInTheDocument();
    expect(screen.getByLabelText("07-10 新增 2")).toBeInTheDocument();
  });

  it("今天的柱 (offset=6) 用 emerald-500 深色", () => {
    render(
      <SimStatusBreakdown
        stats={baseStats}
        newSimsLast7Days={newSimsLast7Days}
      />
    );
    const todayBar = screen.getByLabelText("07-13 新增 1");
    expect(todayBar.getAttribute("style")).toContain("rgb(16, 185, 129)"); // emerald-500
  });

  it("其他天用 emerald-300 浅色", () => {
    render(
      <SimStatusBreakdown
        stats={baseStats}
        newSimsLast7Days={newSimsLast7Days}
      />
    );
    const otherBar = screen.getByLabelText("07-10 新增 2");
    expect(otherBar.getAttribute("style")).toContain("rgb(167, 243, 208)"); // emerald-300
  });

  it("不传 newSimsLast7Days → 不渲染近 7 日区块 (向后兼容)", () => {
    render(<SimStatusBreakdown stats={baseStats} />);
    expect(screen.queryByText("近 7 日新增")).toBeNull();
  });
});

describe("<SimStatusBreakdown /> 近 7 日新增 user (round 171)", () => {
  const newUsersLast7Days = {
    total: 3,
    daily: [
      { date: new Date(Date.UTC(2026, 6, 7)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 8)), count: 1 },
      { date: new Date(Date.UTC(2026, 6, 9)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 10)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 11)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 12)), count: 1 },
      { date: new Date(Date.UTC(2026, 6, 13)), count: 1 },
    ],
  };

  it("渲染 '近 7 日新增用户 N 个'", () => {
    render(
      <SimStatusBreakdown
        stats={baseStats}
        newUsersLast7Days={newUsersLast7Days}
      />
    );
    expect(screen.getByText("近 7 日新增用户")).toBeInTheDocument();
    // 3 个用户
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("7 天无新绑定时显示 '7 天无新绑定'", () => {
    const emptyNew = { total: 0, daily: newUsersLast7Days.daily.map((d) => ({ ...d, count: 0 })) };
    render(
      <SimStatusBreakdown stats={baseStats} newUsersLast7Days={emptyNew} />
    );
    expect(screen.getByText("7 天无新绑定")).toBeInTheDocument();
  });

  it("渲染 7 个 user 柱 (indigo 色系)", () => {
    render(
      <SimStatusBreakdown
        stats={baseStats}
        newUsersLast7Days={newUsersLast7Days}
      />
    );
    // 找 07-13 新增 1 的柱 (今天的)
    const todayBar = screen.getByLabelText("07-13 新增 1");
    expect(todayBar).toBeInTheDocument();
    // aria-label 是 '近 7 日新增 user 趋势'
    const userList = screen.getByLabelText("近 7 日新增 user 趋势");
    expect(userList).toBeInTheDocument();
  });

  it("今天的 user 柱 (offset=6) 用 indigo-600 深色", () => {
    render(
      <SimStatusBreakdown
        stats={baseStats}
        newUsersLast7Days={newUsersLast7Days}
      />
    );
    const todayBar = screen.getByLabelText("07-13 新增 1");
    expect(todayBar.getAttribute("style")).toContain("rgb(99, 102, 241)"); // indigo-600
  });

  it("其他天用 indigo-300 浅色 (跟 sim 用 emerald 区分)", () => {
    render(
      <SimStatusBreakdown
        stats={baseStats}
        newUsersLast7Days={newUsersLast7Days}
      />
    );
    const otherBar = screen.getByLabelText("07-08 新增 1");
    expect(otherBar.getAttribute("style")).toContain("rgb(199, 210, 254)"); // indigo-300
  });

  it("不传 newUsersLast7Days → 不渲染近 7 日新增用户区块", () => {
    render(<SimStatusBreakdown stats={baseStats} />);
    expect(screen.queryByText("近 7 日新增用户")).toBeNull();
  });
});

describe("<SimStatusBreakdown /> 绑定率近 7 日变化 (round 172)", () => {
  const bindRateLast7Days = [
    { date: new Date(Date.UTC(2026, 6, 7)), boundCount: 20, totalSimCount: 50, bindRate: 40 },
    { date: new Date(Date.UTC(2026, 6, 8)), boundCount: 22, totalSimCount: 50, bindRate: 44 },
    { date: new Date(Date.UTC(2026, 6, 9)), boundCount: 25, totalSimCount: 50, bindRate: 50 },
    { date: new Date(Date.UTC(2026, 6, 10)), boundCount: 26, totalSimCount: 51, bindRate: 51 },
    { date: new Date(Date.UTC(2026, 6, 11)), boundCount: 28, totalSimCount: 51, bindRate: 55 },
    { date: new Date(Date.UTC(2026, 6, 12)), boundCount: 30, totalSimCount: 52, bindRate: 58 },
    { date: new Date(Date.UTC(2026, 6, 13)), boundCount: 30, totalSimCount: 52, bindRate: 58 },
  ];

  it("渲染 '近 7 日绑定率' + 7 个 mini bar", () => {
    render(
      <SimStatusBreakdown
        stats={baseStats}
        bindRateLast7Days={bindRateLast7Days}
      />
    );
    expect(screen.getByText(/近 7 日绑定率/)).toBeInTheDocument();
    expect(screen.getByLabelText("近 7 日绑定率变化")).toBeInTheDocument();
  });

  it("今天 (40 → 58) → +18% 变化 (emerald)", () => {
    render(
      <SimStatusBreakdown
        stats={baseStats}
        bindRateLast7Days={bindRateLast7Days}
      />
    );
    // 58 - 40 = +18%
    expect(screen.getByText(/\+18% 变化/)).toBeInTheDocument();
  });

  it("下降趋势 (60 → 50) → -10% 变化 (rose)", () => {
    const declining = [
      { date: new Date(Date.UTC(2026, 6, 7)), boundCount: 30, totalSimCount: 50, bindRate: 60 },
      { date: new Date(Date.UTC(2026, 6, 8)), boundCount: 30, totalSimCount: 51, bindRate: 59 },
      { date: new Date(Date.UTC(2026, 6, 9)), boundCount: 29, totalSimCount: 51, bindRate: 57 },
      { date: new Date(Date.UTC(2026, 6, 10)), boundCount: 28, totalSimCount: 52, bindRate: 54 },
      { date: new Date(Date.UTC(2026, 6, 11)), boundCount: 27, totalSimCount: 52, bindRate: 52 },
      { date: new Date(Date.UTC(2026, 6, 12)), boundCount: 26, totalSimCount: 53, bindRate: 49 },
      { date: new Date(Date.UTC(2026, 6, 13)), boundCount: 26, totalSimCount: 52, bindRate: 50 },
    ];
    render(
      <SimStatusBreakdown
        stats={baseStats}
        bindRateLast7Days={declining}
      />
    );
    // 50 - 60 = -10%
    expect(screen.getByText(/-10% 变化/)).toBeInTheDocument();
  });

  it("稳定趋势 (50 → 50) → 0% 变化 (slate)", () => {
    const stable = bindRateLast7Days.map((d) => ({ ...d, bindRate: 50 }));
    render(
      <SimStatusBreakdown
        stats={baseStats}
        bindRateLast7Days={stable}
      />
    );
    expect(screen.getByText(/0% 变化/)).toBeInTheDocument();
  });

  it("不传 bindRateLast7Days → 不渲染绑定率变化区块", () => {
    render(<SimStatusBreakdown stats={baseStats} />);
    expect(screen.queryByText(/近 7 日绑定率/)).toBeNull();
  });

  it("空数组 → 不渲染", () => {
    const { container } = render(
      <SimStatusBreakdown stats={baseStats} bindRateLast7Days={[]} />
    );
    expect(container.textContent).not.toContain("近 7 日绑定率");
  });
});

describe("<SimStatusBreakdown /> 进度条点击跳转 (round 179)", () => {
  it("活跃/暂停 进度条变 Link,跳 /admin/sims?status=active", () => {
    const { container } = render(<SimStatusBreakdown stats={baseStats} />);
    const activeLink = container.querySelector('a[href="/admin/sims?status=active"]');
    expect(activeLink).not.toBeNull();
    expect(activeLink!.getAttribute("href")).toBe("/admin/sims?status=active");
  });

  it("已绑/未绑 进度条变 Link,跳 /admin/sims?bound=no", () => {
    const { container } = render(<SimStatusBreakdown stats={baseStats} />);
    const boundLink = container.querySelector('a[href="/admin/sims?bound=no"]');
    expect(boundLink).not.toBeNull();
    expect(boundLink!.getAttribute("href")).toBe("/admin/sims?bound=no");
  });

  it("hover 进度条变 slate-50 背景色 (transition-colors)", () => {
    const { container } = render(<SimStatusBreakdown stats={baseStats} />);
    const activeLink = container.querySelector('a[href="/admin/sims?status=active"]');
    expect(activeLink!.className).toContain("hover:bg-slate-50");
    expect(activeLink!.className).toContain("transition-colors");
  });
});

describe("<SimStatusBreakdown /> 近 7 日新增 sim 柱 (round 187)", () => {
  const newSimsLast7Days = {
    total: 5,
    daily: [
      { date: new Date(Date.UTC(2026, 6, 7)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 8)), count: 1 },
      { date: new Date(Date.UTC(2026, 6, 9)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 10)), count: 2 },
      { date: new Date(Date.UTC(2026, 6, 11)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 12)), count: 1 },
      { date: new Date(Date.UTC(2026, 6, 13)), count: 1 },
    ],
  };

  it("每根 sim 柱是 Link,跳 /admin/sims?from=&to= 当天", () => {
    const { container } = render(
      <SimStatusBreakdown
        stats={baseStats}
        newSimsLast7Days={newSimsLast7Days}
      />
    );
    const simLinks = container.querySelectorAll('a[href^="/admin/sims?from="]');
    expect(simLinks.length).toBe(7);
  });

  it("今天的 sim 柱 (offset=6) 跳今天日期", () => {
    const { container } = render(
      <SimStatusBreakdown
        stats={baseStats}
        newSimsLast7Days={newSimsLast7Days}
      />
    );
    const todayLink = container.querySelector('a[aria-label="07-13 新增 1"]');
    expect(todayLink?.getAttribute("href")).toBe("/admin/sims?from=2026-07-13&to=2026-07-13");
  });

  it("hover 提示 '(点击查看当日 sim)'", () => {
    const { container } = render(
      <SimStatusBreakdown
        stats={baseStats}
        newSimsLast7Days={newSimsLast7Days}
      />
    );
    expect(container.querySelectorAll("a[title*='点击查看当日 sim']").length).toBe(7);
  });
});

describe("<SimStatusBreakdown /> 近 7 日新增 user 柱 (round 188)", () => {
  const newUsersLast7Days = {
    total: 3,
    daily: [
      { date: new Date(Date.UTC(2026, 6, 7)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 8)), count: 1 },
      { date: new Date(Date.UTC(2026, 6, 9)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 10)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 11)), count: 0 },
      { date: new Date(Date.UTC(2026, 6, 12)), count: 1 },
      { date: new Date(Date.UTC(2026, 6, 13)), count: 1 },
    ],
  };

  it("每根 user 柱是 Link,跳 /admin/users?from=&to= 当天", () => {
    const { container } = render(
      <SimStatusBreakdown
        stats={baseStats}
        newUsersLast7Days={newUsersLast7Days}
      />
    );
    const userLinks = container.querySelectorAll('a[href^="/admin/users?from="]');
    expect(userLinks.length).toBe(7);
  });

  it("今天的 user 柱 (offset=6) 跳今天日期", () => {
    const { container } = render(
      <SimStatusBreakdown
        stats={baseStats}
        newUsersLast7Days={newUsersLast7Days}
      />
    );
    const todayLink = container.querySelector('a[aria-label="07-13 新增 1"]');
    expect(todayLink?.getAttribute("href")).toBe("/admin/users?from=2026-07-13&to=2026-07-13");
  });

  it("hover 提示 '(点击查看当日 user)'", () => {
    const { container } = render(
      <SimStatusBreakdown
        stats={baseStats}
        newUsersLast7Days={newUsersLast7Days}
      />
    );
    expect(container.querySelectorAll("a[title*='点击查看当日 user']").length).toBe(7);
  });
});
