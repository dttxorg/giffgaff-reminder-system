import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminShell } from "../../app/admin/_components/admin-shell";

let mockPathname = "/admin";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("<AdminShell />", () => {
  beforeEach(() => {
    mockPathname = "/admin";
  });

  it("受保护后台路径显示导航侧栏", () => {
    const { container } = render(
      <AdminShell>
        <p>后台内容</p>
      </AdminShell>
    );
    expect(container.querySelector("aside")).toBeInTheDocument();
    expect(screen.getByText("后台内容")).toBeInTheDocument();
  });

  it("登录路径不渲染后台导航和面包屑", () => {
    mockPathname = "/admin/login";
    const { container } = render(
      <AdminShell>
        <p>登录内容</p>
      </AdminShell>
    );
    expect(container.querySelector("aside")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "面包屑" })).not.toBeInTheDocument();
    expect(screen.getByText("登录内容")).toBeInTheDocument();
  });
});
