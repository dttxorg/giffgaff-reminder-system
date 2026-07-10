import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkipToContent, Spinner } from "../../app/_components/skip-to-content";

describe("<SkipToContent />", () => {
  it("渲染一个跳到 #main-content 的链接", () => {
    render(<SkipToContent />);
    const link = screen.getByRole("link", { name: "跳到主要内容" });
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("默认视觉隐藏(sr-only 类),focus 时显示", () => {
    const { container } = render(<SkipToContent />);
    const link = container.querySelector("a")!;
    expect(link.className).toContain("sr-only");
    // focus 时显示
    expect(link.className).toContain("focus:not-sr-only");
  });
});

describe("<Spinner />", () => {
  it("默认 size=16", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("height", "16");
  });

  it("自定义 size 生效", () => {
    const { container } = render(<Spinner size={24} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
  });

  it("aria-label 文本在 sr-only span 里(屏幕阅读器可读)", () => {
    render(<Spinner label="处理中" />);
    const span = screen.getByText("处理中");
    expect(span).toBeInTheDocument();
    expect(span.className).toContain("sr-only");
  });

  it("SVG 用 animate-spin 类做旋转动画", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    // SVGElement.className 是 SVGAnimatedString,getAttribute 才能拿到字符串
    expect(svg?.getAttribute("class")).toContain("animate-spin");
  });

  it("额外 className 合并到外层", () => {
    const { container } = render(<Spinner className="text-white" />);
    const wrapper = container.querySelector("span");
    expect(wrapper?.className).toContain("text-white");
  });
});
