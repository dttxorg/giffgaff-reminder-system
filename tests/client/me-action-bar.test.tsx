/**
 * /me 底部 action bar (Round 218)
 * 4 个 pill 按钮:设置 / 绑定更多 / 推送历史 / 退出
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActionBar } from "../../app/me/_components/action-bar";

describe("<ActionBar />", () => {
  it("渲染 4 个核心按钮", () => {
    render(<ActionBar activeSimId={1} />);
    expect(screen.getByRole("link", { name: /设置/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /绑定更多 SIM 卡/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /推送历史/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /退出/ })).toBeInTheDocument();
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

  it("退出 → /api/auth/logout", () => {
    render(<ActionBar activeSimId={1} />);
    const link = screen.getByRole("link", { name: /退出/ });
    expect(link).toHaveAttribute("href", "/api/auth/logout");
  });

  it("有 nav landmark 包装(无障碍)", () => {
    render(<ActionBar activeSimId={1} />);
    expect(screen.getByRole("navigation", { name: /账号操作/ })).toBeInTheDocument();
  });

  it("退出按钮的样式是次要色(没 indigo 背景,避免和主要操作混)", () => {
    const { container } = render(<ActionBar activeSimId={1} />);
    const exitLink = screen.getByRole("link", { name: /退出/ });
    // 退出按钮不应有 bg-indigo-* 类
    expect(exitLink.className).not.toMatch(/bg-indigo-/);
  });
});
