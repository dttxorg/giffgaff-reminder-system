import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { default: LoginPage } = await import("../../app/login/page");

beforeEach(() => {
  mockPush.mockReset();
  mockRefresh.mockReset();
  mockFetch.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("<LoginPage />", () => {
  it("默认显示 '我有账号' tab + 登录表单", () => {
    render(<LoginPage />);
    // 两个 tab 都存在
    expect(screen.getByRole("tab", { name: "我有账号" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /我有卡密/ })).toBeInTheDocument();
    // 登录 tab 选中
    expect(screen.getByRole("tab", { name: "我有账号" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    // 登录表单出现(密码框)
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
  });

  it("点 '我有卡密' tab → 切到兑换面板,登录表单消失", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole("tab", { name: /我有卡密/ }));

    expect(screen.getByRole("tab", { name: /我有卡密/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    // 标题切到 "兑换卡密"
    expect(screen.getByRole("heading", { name: "兑换卡密" })).toBeInTheDocument();
    // 登录密码框消失
    expect(document.querySelector('input[type="password"]')).not.toBeInTheDocument();
    // 兑换面板:有 "去兑换页" 链接
    const redeemLink = screen.getByRole("link", { name: /去兑换页/ });
    expect(redeemLink).toBeInTheDocument();
    expect(redeemLink).toHaveAttribute("href", "/redeem");
    // 卡密示例
    expect(screen.getByText(/XXXX-XXXX-XXXX-XXXX/)).toBeInTheDocument();
  });

  it("切回 '我有账号' tab → 重新显示登录表单,保留输入", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const simInput = screen.getByPlaceholderText(/07724/);
    await user.type(simInput, "07724215611");
    // 切走
    await user.click(screen.getByRole("tab", { name: /我有卡密/ }));
    // 切回
    await user.click(screen.getByRole("tab", { name: "我有账号" }));
    // 输入保留
    expect((simInput as HTMLInputElement).value).toBe("07724215611");
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
  });

  it("登录成功 → router.push 到 redirect 字段(默认 /me)", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, redirect: "/me" }),
    });
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/07724/), "07724215611");
    await user.type(document.querySelector('input[type="password"]')!, "secret123");
    await user.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({ method: "POST" })
      )
    );
    expect(mockPush).toHaveBeenCalledWith("/me");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("登录失败 → 显示后端错误信息", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: "密码错误" }),
    });
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/07724/), "07724215611");
    await user.type(document.querySelector('input[type="password"]')!, "wrong");
    await user.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByText("密码错误")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("切 tab 清除已有的错误信息", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: "密码错误" }),
    });
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/07724/), "07724215611");
    await user.type(document.querySelector('input[type="password"]')!, "wrong");
    await user.click(screen.getByRole("button", { name: "登录" }));
    expect(await screen.findByText("密码错误")).toBeInTheDocument();
    // 切到兑换 tab
    await user.click(screen.getByRole("tab", { name: /我有卡密/ }));
    // 错误消失
    expect(screen.queryByText("密码错误")).not.toBeInTheDocument();
  });

  it("底部始终显示 '忘记密码' 提示,不依赖当前 tab", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    expect(screen.getByText(/忘记密码请联系管理员重置/)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /我有卡密/ }));
    expect(screen.getByText(/忘记密码请联系管理员重置/)).toBeInTheDocument();
  });

  it("提交中 → LoadingButton 显示 '登录中' 文本 + Spinner(aria-busy=true) + disabled", async () => {
    const user = userEvent.setup();
    // 让 fetch 一直 pending,确保 loading 状态保持
    mockFetch.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolve */
        })
    );
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/07724/), "07724215611");
    await user.type(document.querySelector('input[type="password"]')!, "secret123");
    await user.click(screen.getByRole("button", { name: "登录" }));

    // loading 态:LoadingButton 显示 loadingLabel "登录中"
    // 用 getAllByText 找包含 '登录中' 的元素(Spinner sr-only label + 文本)
    const allBtns = screen.getAllByRole("button");
    const submitBtn = allBtns.find((b) => b.getAttribute("type") === "submit")!;
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "true");
    expect(submitBtn).toHaveTextContent("登录中");
  });
});

describe("<LoginPage /> disabled 视觉(L4)", () => {
  it("提交中(disabled=true)→ LoadingButton 变浅色(disabled:bg-indigo-300)+ aria-busy=true", async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation(
      () => new Promise(() => {})
    );
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/07724/), "07724215611");
    await user.type(document.querySelector('input[type="password"]')!, "secret123");
    await user.click(screen.getByRole("button", { name: "登录" }));

    const allBtns = screen.getAllByRole("button");
    const submitBtn = allBtns.find((b) => b.getAttribute("type") === "submit")!;
    // 加载时按钮被禁用,LoadingButton 用 disabled:bg-indigo-300 视觉变浅
    expect(submitBtn.className).toContain("disabled:bg-indigo-300");
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "true");
  });
});
