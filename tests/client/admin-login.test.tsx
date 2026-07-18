import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockFetch = vi.fn();
vi.spyOn(globalThis, "fetch").mockImplementation(mockFetch);

const { default: AdminLoginPage } = await import("../../app/admin/login/page");

beforeEach(() => {
  mockPush.mockReset();
  mockRefresh.mockReset();
  mockFetch.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("<AdminLoginPage />", () => {
  it("默认渲染账号密码表单 + 顶部 context bar(A6 修复)", () => {
    render(<AdminLoginPage />);
    // 顶部 context bar:管理入口 + 用户登录出口
    expect(screen.getByText("管理入口")).toBeInTheDocument();
    const userLink = screen.getByRole("link", { name: /去用户登录/ });
    expect(userLink).toHaveAttribute("href", "/login");
  });

  it("点击 '去用户登录' → 跳到 /login,不出 fetch", async () => {
    const user = userEvent.setup();
    render(<AdminLoginPage />);
    // 链接是 <a>,click 不会触发 router.push
    await user.click(screen.getByRole("link", { name: /去用户登录/ }));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("提交登录 → 调 /api/admin/auth/login,成功后 router.push", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, redirect: "/admin" }),
    });
    render(<AdminLoginPage />);
    await user.type(document.querySelector('input[autocomplete="username"]')!, "admin");
    await user.type(document.querySelector('input[autocomplete="current-password"]')!, "admin123");
    await user.click(screen.getByRole("button", { name: /登录/ }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/auth/login",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockPush).toHaveBeenCalledWith("/admin");
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("登录失败 → 显示后端错误", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: "账号或密码错误" }),
    });
    render(<AdminLoginPage />);
    await user.type(document.querySelector('input[autocomplete="username"]')!, "admin");
    await user.type(document.querySelector('input[autocomplete="current-password"]')!, "wrong");
    await user.click(screen.getByRole("button", { name: /登录/ }));

    expect(await screen.findByText("账号或密码错误")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("底部 '返回首页' 链接在", () => {
    render(<AdminLoginPage />);
    const homeLink = screen.getByRole("link", { name: /返回首页/ });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("不公开默认账号密码，并说明账号由部署环境配置", () => {
    render(<AdminLoginPage />);
    expect(screen.getByText(/不会自动创建默认账号/)).toBeInTheDocument();
    expect(screen.queryByText(/admin123/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("动态验证码（可选）")).toBeInTheDocument();
  });
});
