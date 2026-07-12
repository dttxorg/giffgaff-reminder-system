import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../../app/_components/empty-state";

describe("<EmptyState />", () => {
  it("只渲染标题", () => {
    render(<EmptyState title="没有数据" />);
    expect(screen.getByText("没有数据")).toBeInTheDocument();
  });

  it("标题 + 提示", () => {
    render(<EmptyState title="没有数据" hint="先添加第一条" />);
    expect(screen.getByText("没有数据")).toBeInTheDocument();
    expect(screen.getByText("先添加第一条")).toBeInTheDocument();
  });

  it("有 actions 时渲染链接", () => {
    render(
      <EmptyState
        title="没有用户"
        actions={[
          { href: "/users/new", label: "+ 新增用户", primary: true },
          { href: "/users/import", label: "导入" },
        ]}
      />
    );
    expect(screen.getByText("没有用户")).toBeInTheDocument();
    const addLink = screen.getByRole("link", { name: "+ 新增用户" });
    expect(addLink).toHaveAttribute("href", "/users/new");
    expect(addLink.className).toContain("bg-indigo-600");
    const importLink = screen.getByRole("link", { name: "导入" });
    expect(importLink).toHaveAttribute("href", "/users/import");
    expect(importLink.className).not.toContain("bg-indigo-600");
  });

  it("无 actions 时不渲染链接区", () => {
    render(<EmptyState title="空" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("默认渲染 SVG inbox icon (aria-hidden)", () => {
    const { container } = render(<EmptyState title="x" />);
    // 默认 icon 是 SVG,带 aria-hidden
    const svg = container.querySelector("svg[aria-hidden='true']");
    expect(svg).toBeInTheDocument();
    // 默认 tone 是 slate,class 含 text-slate-300
    expect(svg?.parentElement?.className).toContain("text-slate-300");
  });

  it("传 icon prop 时覆盖默认 icon", () => {
    const { container } = render(
      <EmptyState
        title="custom"
        icon={<span data-testid="custom-icon">📦</span>}
      />
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    // 原来的 SVG 默认 icon 应该不再渲染
    expect(container.querySelector("svg[aria-hidden='true']")).not.toBeInTheDocument();
  });

  it("3 种 tone 渲染对应 icon 颜色", () => {
    const { container, rerender } = render(<EmptyState title="t" tone="default" />);
    expect(container.querySelector("svg")?.parentElement?.className).toContain(
      "text-slate-300"
    );
    rerender(<EmptyState title="t" tone="success" />);
    expect(container.querySelector("svg")?.parentElement?.className).toContain(
      "text-emerald-300"
    );
    rerender(<EmptyState title="t" tone="warning" />);
    expect(container.querySelector("svg")?.parentElement?.className).toContain(
      "text-amber-300"
    );
  });
});