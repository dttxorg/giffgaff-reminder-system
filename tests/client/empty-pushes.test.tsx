/**
 * /me/pushes 空状态 (Round 224)
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyPushes } from "../../app/me/_components/empty-pushes";

describe("<EmptyPushes />", () => {
  it("无筛选:无任何推送记录", () => {
    render(<EmptyPushes hasDateFilter={false} />);
    expect(screen.getByText("还没有推送记录")).toBeInTheDocument();
    expect(
      screen.getByText(/运营商预设或自定义提醒日期自动推送/)
    ).toBeInTheDocument();
  });

  it("有日期过滤:有匹配提示 + 清除链接", () => {
    render(<EmptyPushes hasDateFilter={true} />);
    expect(screen.getByText("没有匹配的推送记录")).toBeInTheDocument();
    const clearLink = screen.getByRole("link", { name: /清除所有筛选/ });
    expect(clearLink).toHaveAttribute("href", "/me/pushes");
  });

  it("有状态过滤:有匹配提示", () => {
    render(<EmptyPushes status="failed" hasDateFilter={false} />);
    expect(screen.getByText("没有匹配的推送记录")).toBeInTheDocument();
  });

  it("状态 + 日期同时过滤:也显示清除链接", () => {
    render(<EmptyPushes status="success" hasDateFilter={true} />);
    expect(screen.getByText("没有匹配的推送记录")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /清除所有筛选/ })).toBeInTheDocument();
  });
});
