/**
 * /me 底部 action bar (Round 218)
 * 4 个 pill 按钮:设置 / 绑定更多 / 推送历史 / 退出
 */
import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionBar } from "../../app/me/_components/action-bar";

const { mockPush, mockRefresh } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

describe("<ActionBar />", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    vi.unstubAllGlobals();
  });

  it("渲染 4 个核心按钮", () => {
    render(<ActionBar activeSimId={1} />);
    expect(screen.getByRole("link", { name: /设置/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /绑定更多 SIM 卡/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /推送历史/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /退出/ })).toBeInTheDocument();
  });

  it("设置 链接带 ?simId= 跳到当前 sim 的设置", () => {
    render(<ActionBar activeSimId={42} />);
    const link = screen.getByRole("link", { name: /设置/ });
    expect(link).toHaveAttribute("href", "/me/settings?simId=42");
  });

  it("activeSimId 为 null 时设置链接 simId 为空字符串(不报错)", () => {
    render(<ActionBar activeSimId={null} />);
    const link = screen.getByRole("link", { name: /设置/ });
    expect(link).toHaveAttribute("href", "/me/settings?simId=");
  });

  it("绑定更多 SIM 卡 → /redeem", () => {
    render(<ActionBar activeSimId={1} />);
    const link = screen.getByRole("link", { name: /绑定更多 SIM 卡/ });
    expect(link).toHaveAttribute("href", "/redeem");
  });

  it("推送历史 → /me/pushes", () => {
    render(<ActionBar activeSimId={1} />);
    const link = screen.getByRole("link", { name: /推送历史/ });
    expect(link).toHaveAttribute("href", "/me/pushes");
  });

  it("退出使用 POST 接口并返回首页", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<ActionBar activeSimId={1} />);

    await user.click(screen.getByRole("button", { name: "退出" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("有 nav landmark 包装(无障碍)", () => {
    render(<ActionBar activeSimId={1} />);
    expect(screen.getByRole("navigation", { name: /账号操作/ })).toBeInTheDocument();
  });

  it("退出按钮的样式是次要色(没 indigo 背景,避免和主要操作混)", () => {
    render(<ActionBar activeSimId={1} />);
    const exitButton = screen.getByRole("button", { name: /退出/ });
    // 退出按钮不应有 bg-indigo-* 类
    expect(exitButton.className).not.toMatch(/bg-indigo-/);
  });

  it("退出失败时恢复按钮并显示可重试提示", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<ActionBar activeSimId={1} />);

    await user.click(screen.getByRole("button", { name: "退出" }));

    expect(screen.getByRole("alert")).toHaveTextContent("退出失败");
    expect(screen.getByRole("button", { name: "退出" })).toBeEnabled();
  });
});
