import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SimTabs } from "../../app/me/_components/sim-tabs";

describe("<SimTabs />", () => {
  it("渲染所有 sim,默认全 inactive,主卡打'主'标", () => {
    const sims = [
      { id: 1, phoneTail4: "1234", status: "active" as const, missingChannel: false },
      { id: 2, phoneTail4: "5678", status: "active" as const, missingChannel: false },
    ];
    render(<SimTabs sims={sims} activeSimId={1} />);
    // 主卡标
    expect(screen.getByText("主")).toBeInTheDocument();
    // 号码显示(每个 tab **** XXXX)
    expect(screen.getAllByText(/1234|5678/)).toHaveLength(2);
    // 选中态
    const tab1 = screen.getByRole("tab", { name: /1234/ });
    const tab2 = screen.getByRole("tab", { name: /5678/ });
    expect(tab1).toHaveAttribute("aria-selected", "true");
    expect(tab2).toHaveAttribute("aria-selected", "false");
    // href 含 ?simId=X
    expect(tab1).toHaveAttribute("href", "/me?simId=1");
    expect(tab2).toHaveAttribute("href", "/me?simId=2");
  });

  it("未设渠道的 sim tab 上有红点(aria-label)", () => {
    const sims = [
      { id: 1, phoneTail4: "1234", status: "active" as const, missingChannel: true },
    ];
    render(<SimTabs sims={sims} activeSimId={1} />);
    expect(screen.getByLabelText("未设置通知渠道")).toBeInTheDocument();
  });

  it("已暂停 sim tab 上有灰点(aria-label)", () => {
    const sims = [
      { id: 1, phoneTail4: "1234", status: "paused" as const, missingChannel: false },
    ];
    render(<SimTabs sims={sims} activeSimId={1} />);
    expect(screen.getByLabelText("已暂停")).toBeInTheDocument();
  });

  it("最后有'+ 添加' tab → 跳 /redeem", () => {
    const sims = [
      { id: 1, phoneTail4: "1234", status: "active" as const, missingChannel: false },
    ];
    render(<SimTabs sims={sims} activeSimId={1} />);
    const addTab = screen.getByRole("link", { name: /添加/ });
    expect(addTab).toHaveAttribute("href", "/redeem");
  });

  it("activeSimId 不在列表时,所有 tab 都未选中(不报错)", () => {
    const sims = [
      { id: 1, phoneTail4: "1234", status: "active" as const, missingChannel: false },
    ];
    render(<SimTabs sims={sims} activeSimId={99} />);
    const tab = screen.getByRole("tab", { name: /1234/ });
    expect(tab).toHaveAttribute("aria-selected", "false");
  });

  it("空 sims 数组(理论上不会到这里)也不报错", () => {
    render(<SimTabs sims={[]} activeSimId={1} />);
    // 只剩 "+ 添加" tab
    expect(screen.getByRole("link", { name: /添加/ })).toBeInTheDocument();
  });
});
