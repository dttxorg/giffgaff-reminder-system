import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExternalLink } from "../../app/_components/external-link";

describe("<ExternalLink />", () => {
  it("渲染带 target=_blank 和 rel=noreferrer 的链接", () => {
    render(
      <ExternalLink href="https://example.com">
        Example
      </ExternalLink>
    );
    const link = screen.getByRole("link", { name: /Example/ });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("渲染尾部外链 SVG 图标", () => {
    const { container } = render(
      <ExternalLink href="https://example.com">Click me</ExternalLink>
    );
    // SVG with aria-hidden="true" + viewBox 0 0 24 24
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
  });

  it("渲染 sr-only 提示 '(在新窗口打开)' 给屏幕阅读器", () => {
    render(
      <ExternalLink href="https://example.com">External</ExternalLink>
    );
    expect(screen.getByText("(在新窗口打开)")).toBeInTheDocument();
  });

  it("custom className 传递到底层 Link", () => {
    render(
      <ExternalLink
        href="https://example.com"
        className="text-red-600 font-bold"
      >
        Styled
      </ExternalLink>
    );
    const link = screen.getByRole("link", { name: /Styled/ });
    expect(link.className).toContain("text-red-600");
    expect(link.className).toContain("font-bold");
    // 同时保留默认 inline-flex + items-center + gap-1
    expect(link.className).toContain("inline-flex");
  });

  it("链接文本内容正确显示", () => {
    render(
      <ExternalLink href="https://github.com/foo/bar">
        GitHub 仓库
      </ExternalLink>
    );
    expect(screen.getByText("GitHub 仓库")).toBeInTheDocument();
  });
});
