import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NavIcon } from "../../app/admin/_components/nav-icon";

describe("<NavIcon />", () => {
  it("6 个 name 都渲染 SVG 元素", () => {
    const names = ["dashboard", "phone", "ticket", "users", "log", "settings"] as const;
    for (const name of names) {
      const { container } = render(<NavIcon name={name} />);
      const svg = container.querySelector("svg");
      expect(svg, `name=${name} should render svg`).toBeInTheDocument();
      // 统一尺寸,跟菜单文字对齐
      expect(svg).toHaveAttribute("width", "16");
      expect(svg).toHaveAttribute("height", "16");
      // 装饰性图标,屏幕阅读器跳过
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("使用 currentColor 描边,跟父级 text-* 配色联动", () => {
    const { container } = render(<NavIcon name="phone" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("stroke", "currentColor");
  });
});
