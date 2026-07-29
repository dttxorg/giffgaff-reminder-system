/**
 * /me "0 张卡" EmptySims (Round 222)
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptySims } from "../../app/me/_components/empty-sims";

describe("<EmptySims />", () => {
  it("显示主标题'还没有绑定 SIM 卡'", () => {
    render(<EmptySims />);
    expect(screen.getByRole("heading", { name: "还没有绑定 SIM 卡" })).toBeInTheDocument();
  });

  it("显示副标(说明流程)", () => {
    render(<EmptySims />);
    expect(screen.getByText(/Giffgaff 或 CTExcel SIM 卡/)).toBeInTheDocument();
    expect(screen.getByText(/默认提醒周期.*自由调整/)).toBeInTheDocument();
  });

  it("主操作'去兑换卡密'链接到 /redeem", () => {
    render(<EmptySims />);
    const link = screen.getByRole("link", { name: /去兑换卡密/ });
    expect(link).toHaveAttribute("href", "/redeem");
    // 主按钮 indigo 实心
    expect(link.className).toMatch(/bg-indigo-600/);
  });

  it("次要提示'没有卡密?查看获取方式'", () => {
    render(<EmptySims />);
    expect(screen.getByText(/没有卡密/)).toBeInTheDocument();
    const helpLink = screen.getByRole("link", { name: /查看获取方式/ });
    expect(helpLink).toHaveAttribute("href", "/help");
  });

  it("有手机 icon(视觉锚点)", () => {
    const { container } = render(<EmptySims />);
    // indigo-50 圆形 icon 背景
    const iconBg = container.querySelector("div.bg-indigo-50");
    expect(iconBg).toBeInTheDocument();
    // 内部有 SVG
    const svg = iconBg?.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
