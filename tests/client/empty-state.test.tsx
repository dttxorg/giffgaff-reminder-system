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
    // 标题
    expect(screen.getByText("没有用户")).toBeInTheDocument();
    // 两个链接
    const addLink = screen.getByRole("link", { name: "+ 新增用户" });
    expect(addLink).toHaveAttribute("href", "/users/new");
    // primary 链接用 indigo 背景
    expect(addLink.className).toContain("bg-indigo-600");
    // 次要链接
    const importLink = screen.getByRole("link", { name: "导入" });
    expect(importLink).toHaveAttribute("href", "/users/import");
    expect(importLink.className).not.toContain("bg-indigo-600");
  });

  it("无 actions 时不渲染链接区", () => {
    render(<EmptyState title="空" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("默认图标 ○ 存在(aria-hidden)", () => {
    const { container } = render(<EmptyState title="x" />);
    // 第一个 div 内的 text node 是 ○
    expect(container.textContent).toContain("○");
  });
});
