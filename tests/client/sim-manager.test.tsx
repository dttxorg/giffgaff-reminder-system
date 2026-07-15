import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SimManager, type SimManagerItem } from "../../app/me/_components/sim-manager";

const { mockPrefetch } = vi.hoisted(() => ({ mockPrefetch: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ prefetch: mockPrefetch }),
}));

function managerSim(id: number, overrides: Partial<SimManagerItem> = {}): SimManagerItem {
  return {
    id,
    phoneNumber: `07724${String(id).padStart(6, "0")}`,
    status: "active",
    missingChannel: false,
    dayOffset: 100,
    createdAt: new Date(2026, 0, Math.min(id, 28)).toISOString(),
    channel: "serverchan",
    isPrimary: id === 1,
    ...overrides,
  };
}

describe("<SimManager />", () => {
  beforeEach(() => {
    mockPrefetch.mockClear();
  });

  it("50 张卡仍渲染在独立滚动列表中", () => {
    const sims = Array.from({ length: 50 }, (_, index) => managerSim(index + 1));
    const { container } = render(<SimManager sims={sims} activeSimId={1} />);

    expect(screen.getByText("共 50 张")).toBeInTheDocument();
    const numberNav = screen.getByRole("navigation", { name: "受监控的手机号码" });
    expect(numberNav.querySelectorAll("a[href^='/me?simId=']")).toHaveLength(50);
    expect(container.querySelector("ul.overflow-y-auto")).toBeInTheDocument();
  });

  it("默认按紧急程度排序并显示真实状态", () => {
    const sims = [
      managerSim(1),
      managerSim(2, { dayOffset: 175 }),
      managerSim(3, { dayOffset: 185 }),
      managerSim(4, { missingChannel: true }),
      managerSim(5, { status: "paused" }),
    ];
    render(<SimManager sims={sims} activeSimId={3} />);

    const numberNav = screen.getByRole("navigation", { name: "受监控的手机号码" });
    const rows = Array.from(numberNav.querySelectorAll("a[href^='/me?simId=']"));
    expect(rows.map((row) => row.getAttribute("href"))).toEqual([
      "/me?simId=3",
      "/me?simId=2",
      "/me?simId=4",
      "/me?simId=1",
      "/me?simId=5",
    ]);
    expect(screen.getByText("已超期 5 天")).toBeInTheDocument();
    expect(rows[0]).toHaveAttribute("aria-current", "page");
  });

  it("搜索完整号码或尾号并可清除", async () => {
    const user = userEvent.setup();
    const sims = [
      managerSim(1, { phoneNumber: "0772411115611" }),
      managerSim(2, { phoneNumber: "0772422225678" }),
      managerSim(3, { phoneNumber: "0772433330000" }),
    ];
    render(<SimManager sims={sims} activeSimId={1} />);

    const search = screen.getByRole("searchbox", { name: "搜索 SIM 卡" });
    await user.type(search, "5678");
    expect(screen.getByText("显示 1 / 3 张")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /07724 22225678/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "清除搜索" }));
    expect(search).toHaveValue("");
    expect(screen.getByText("显示 3 / 3 张")).toBeInTheDocument();
  });

  it("需处理筛选排除正常和暂停号码", async () => {
    const user = userEvent.setup();
    const sims = [
      managerSim(1),
      managerSim(2, { dayOffset: 175 }),
      managerSim(3, { dayOffset: 185 }),
      managerSim(4, { missingChannel: true }),
      managerSim(5, { status: "paused" }),
    ];
    render(<SimManager sims={sims} activeSimId={1} />);

    await user.click(screen.getByRole("button", { name: /需处理.*3/ }));
    expect(screen.getByText("显示 3 / 5 张")).toBeInTheDocument();

    const numberNav = screen.getByRole("navigation", { name: "受监控的手机号码" });
    expect(numberNav.querySelectorAll("a[href^='/me?simId=']")).toHaveLength(3);
  });

  it("支持按号码排序", async () => {
    const user = userEvent.setup();
    const sims = [
      managerSim(1, { phoneNumber: "0772499999999", dayOffset: 185 }),
      managerSim(2, { phoneNumber: "0772411111111" }),
    ];
    render(<SimManager sims={sims} activeSimId={1} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "号码排序" }), "number");
    const numberNav = screen.getByRole("navigation", { name: "受监控的手机号码" });
    const rows = Array.from(numberNav.querySelectorAll("a[href^='/me?simId=']"));
    expect(rows[0]).toHaveAttribute("href", "/me?simId=2");
  });

  it("移动端切换按钮维护展开状态", async () => {
    const user = userEvent.setup();
    render(<SimManager sims={[managerSim(1), managerSim(2)]} activeSimId={1} />);

    const toggle = screen.getByRole("button", { name: /切换号码/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: /收起/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("搜索、筛选与展开操作均可使用键盘", async () => {
    const user = userEvent.setup();
    render(
      <SimManager
        sims={[managerSim(1), managerSim(2, { dayOffset: 175 })]}
        activeSimId={1}
      />
    );

    const toggle = screen.getByRole("button", { name: /切换号码/ });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const search = screen.getByRole("searchbox", { name: "搜索 SIM 卡" });
    search.focus();
    await user.keyboard("000002");
    expect(screen.getByText("显示 1 / 2 张")).toBeInTheDocument();

    await user.clear(search);
    const windowFilter = screen.getByRole("button", { name: /窗口内.*1/ });
    windowFilter.focus();
    await user.keyboard(" ");
    expect(windowFilter).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("显示 1 / 2 张")).toBeInTheDocument();
  });

  it("无结果时可以一次清除搜索和筛选", async () => {
    const user = userEvent.setup();
    render(<SimManager sims={[managerSim(1)]} activeSimId={1} />);

    await user.type(screen.getByRole("searchbox", { name: "搜索 SIM 卡" }), "不存在");
    const numberNav = screen.getByRole("navigation", { name: "受监控的手机号码" });
    expect(within(numberNav).getByText("没有符合条件的号码")).toBeInTheDocument();
    await user.click(within(numberNav).getByRole("button", { name: "清除筛选" }));
    expect(screen.getByText("显示 1 / 1 张")).toBeInTheDocument();
  });

  it("始终提供绑定更多入口", () => {
    render(<SimManager sims={[managerSim(1)]} activeSimId={1} />);
    expect(screen.getByRole("link", { name: /绑定更多 SIM 卡/ })).toHaveAttribute("href", "/redeem");
  });

  it("聚焦号码时按需预取，避免初始 50 条链接同时预取", () => {
    render(<SimManager sims={[managerSim(1), managerSim(2)]} activeSimId={1} />);

    expect(mockPrefetch).not.toHaveBeenCalled();
    fireEvent.focus(screen.getByRole("link", { name: /07724 000002/ }));
    expect(mockPrefetch).toHaveBeenCalledOnce();
    expect(mockPrefetch).toHaveBeenCalledWith("/me?simId=2");
  });

  it("点击目标号码后立即显示正在加载，并在新详情到达后恢复", () => {
    const sims = [managerSim(1), managerSim(2)];
    const { rerender } = render(<SimManager sims={sims} activeSimId={1} />);
    const secondSim = screen.getByRole("link", { name: /07724 000002/ });

    secondSim.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(secondSim, { button: 0 });
    expect(secondSim).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("正在加载")).toBeInTheDocument();

    rerender(<SimManager sims={sims} activeSimId={2} />);
    expect(screen.queryByText("正在加载")).not.toBeInTheDocument();
  });
});
