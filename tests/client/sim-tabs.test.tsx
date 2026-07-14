import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SimTabs } from "../../app/me/_components/sim-tabs";

describe("<SimTabs />", () => {
  it("渲染所有 sim,默认全 inactive,主卡打'主'标", () => {
    const sims = [
      { id: 1, phoneNumber: "0772411111234", phoneTail4: "1234", status: "active" as const, missingChannel: false },
      { id: 2, phoneNumber: "0772411115678", phoneTail4: "5678", status: "active" as const, missingChannel: false },
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
      { id: 1, phoneNumber: "0772411111234", phoneTail4: "1234", status: "active" as const, missingChannel: true },
    ];
    render(<SimTabs sims={sims} activeSimId={1} />);
    expect(screen.getByLabelText("未设置通知渠道")).toBeInTheDocument();
  });

  it("已暂停 sim tab 上有灰点(aria-label)", () => {
    const sims = [
      { id: 1, phoneNumber: "0772411111234", phoneTail4: "1234", status: "paused" as const, missingChannel: false },
    ];
    render(<SimTabs sims={sims} activeSimId={1} />);
    expect(screen.getByLabelText("已暂停")).toBeInTheDocument();
  });

  it("最后有'+ 添加' tab → 跳 /redeem", () => {
    const sims = [
      { id: 1, phoneNumber: "0772411111234", phoneTail4: "1234", status: "active" as const, missingChannel: false },
    ];
    render(<SimTabs sims={sims} activeSimId={1} />);
    const addTab = screen.getByRole("link", { name: /添加/ });
    expect(addTab).toHaveAttribute("href", "/redeem");
  });

  it("activeSimId 不在列表时,所有 tab 都未选中(不报错)", () => {
    const sims = [
      { id: 1, phoneNumber: "0772411111234", phoneTail4: "1234", status: "active" as const, missingChannel: false },
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
import userEvent from "@testing-library/user-event";

describe("<SimTabs /> 搜索", () => {
  const sims3 = [
    { id: 1, phoneNumber: "0772411115611", phoneTail4: "5611", status: "active" as const, missingChannel: false },
    { id: 2, phoneNumber: "0772422225678", phoneTail4: "5678", status: "active" as const, missingChannel: false },
    { id: 3, phoneNumber: "1380013800000", phoneTail4: "0000", status: "active" as const, missingChannel: false },
  ];

  it("1 张卡时不显示搜索框(单卡不需要)", () => {
    render(<SimTabs sims={[sims3[0]]} activeSimId={1} />);
    expect(screen.queryByPlaceholderText(/搜手机号/)).not.toBeInTheDocument();
  });

  it("2+ 张卡时显示搜索框", () => {
    render(<SimTabs sims={sims3} activeSimId={1} />);
    expect(screen.getByPlaceholderText(/搜手机号/)).toBeInTheDocument();
  });

  it("输入后只显示匹配的 tab", async () => {
    const user = userEvent.setup();
    render(<SimTabs sims={sims3} activeSimId={1} />);
    await user.type(screen.getByPlaceholderText(/搜手机号/), "5678");

    // 只显示 5678 那张
    expect(screen.getByRole("tab", { name: /5678/ })).toBeInTheDocument();
    // 5611 / 0000 隐藏
    expect(screen.queryByRole("tab", { name: /5611/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /0000/ })).not.toBeInTheDocument();
    // '+ 添加' tab 始终在
    expect(screen.getByRole("link", { name: /添加/ })).toBeInTheDocument();
  });

  it("后 4 位匹配:输入 5611 找到 0772411115611", async () => {
    const user = userEvent.setup();
    render(<SimTabs sims={sims3} activeSimId={1} />);
    await user.type(screen.getByPlaceholderText(/搜手机号/), "5611");
    expect(screen.getByRole("tab", { name: /5611/ })).toBeInTheDocument();
  });

  it("带空格也能匹配", async () => {
    const user = userEvent.setup();
    render(<SimTabs sims={sims3} activeSimId={1} />);
    // 输入 "567 8" → 归一化后 "5678" 匹配
    await user.type(screen.getByPlaceholderText(/搜手机号/), "567 8");
    expect(screen.getByRole("tab", { name: /5678/ })).toBeInTheDocument();
  });

  it("无匹配时显示'没找到'提示", async () => {
    const user = userEvent.setup();
    render(<SimTabs sims={sims3} activeSimId={1} />);
    await user.type(screen.getByPlaceholderText(/搜手机号/), "0000000");
    expect(screen.getByText(/没找到匹配/)).toBeInTheDocument();
  });

  it("清除按钮(X)可清空搜索", async () => {
    const user = userEvent.setup();
    render(<SimTabs sims={sims3} activeSimId={1} />);
    const input = screen.getByPlaceholderText(/搜手机号/);
    await user.type(input, "5678");
    // 清除按钮出现(用 aria-label 找)
    const clearBtn = screen.getByLabelText("清除搜索");
    await user.click(clearBtn);
    // 输入框空了,所有 tab 又出现
    expect(input).toHaveValue("");
    expect(screen.getByRole("tab", { name: /5611/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /5678/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /0000/ })).toBeInTheDocument();
  });

  it("搜索后,'主'标仍标识原始的主卡", async () => {
    const user = userEvent.setup();
    render(<SimTabs sims={sims3} activeSimId={1} />);
    await user.type(screen.getByPlaceholderText(/搜手机号/), "0000");
    // 0000 那张是 id=3,不是主卡(id=1),所以不该有'主'标
    const tab0000 = screen.getByRole("tab", { name: /0000/ });
    expect(tab0000).not.toHaveTextContent("主");
  });
});
