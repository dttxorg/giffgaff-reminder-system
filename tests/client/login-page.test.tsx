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

/** Round 224: 登录表单的 username 输入 placeholder(账号而非手机号) */
const USERNAME_PLACEHOLDER = /alice_2024|3-20/;

describe("<LoginPage />", () => {
  it("默认显示 '我有账号' tab + 登录表单", () => {
    render(<LoginPage />);
    expect(screen.getByRole("tab", { name: "我有账号" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /我有卡密/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "我有账号" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
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
    expect(screen.getByRole("heading", { name: "兑换卡密" })).toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).not.toBeInTheDocument();
    const redeemLink = screen.getByRole("link", { name: /去兑换页/ });
    expect(redeemLink).toBeInTheDocument();
    expect(redeemLink).toHaveAttribute("href", "/redeem");
    expect(screen.getByText(/XXXX-XXXX-XXXX-XXXX/)).toBeInTheDocument();
  });

  it("切回 '我有账号' tab → 重新显示登录表单,保留输入", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    // 找账号输入框(用 placeholder 匹配 "alice_2024")
    const usernameInput = screen.getByPlaceholderText(USERNAME_PLACEHOLDER);
    await user.type(usernameInput, "alice_2024");
    await user.click(screen.getByRole("tab", { name: /我有卡密/ }));
    await user.click(screen.getByRole("tab", { name: "我有账号" }));
    expect((usernameInput as HTMLInputElement).value).toBe("alice_2024");
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
  });

  it("登录成功 → router.push 到 redirect 字段(默认 /me)", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, redirect: "/me" }),
    });
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(USERNAME_PLACEHOLDER), "alice_2024");
    await user.type(document.querySelector('input[type="password"]')!, "secret123");
    await user.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({ method: "POST" })
      )
    );
    // 验证请求体里 username 已 lowercase + trim
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.username).toBe("alice_2024");
    expect(callBody.password).toBe("secret123");
    expect(mockPush).toHaveBeenCalledWith("/me");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("登录失败 → 显示后端错误信息", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: "账号或密码错误" }),
    });
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(USERNAME_PLACEHOLDER), "alice_2024");
    await user.type(document.querySelector('input[type="password"]')!, "wrong");
    await user.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByText("账号或密码错误")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("切 tab 清除已有的错误信息", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: "账号或密码错误" }),
    });
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(USERNAME_PLACEHOLDER), "alice_2024");
    await user.type(document.querySelector('input[type="password"]')!, "wrong");
    await user.click(screen.getByRole("button", { name: "登录" }));
    expect(await screen.findByText("账号或密码错误")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /我有卡密/ }));
    expect(screen.queryByText("账号或密码错误")).not.toBeInTheDocument();
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
    mockFetch.mockImplementation(
      () => new Promise(() => { /* never resolve */ })
    );
    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(USERNAME_PLACEHOLDER), "alice_2024");
    await user.type(document.querySelector('input[type="password"]')!, "secret123");
    await user.click(screen.getByRole("button", { name: "登录" }));

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
    await user.type(screen.getByPlaceholderText(USERNAME_PLACEHOLDER), "alice_2024");
    await user.type(document.querySelector('input[type="password"]')!, "secret123");
    await user.click(screen.getByRole("button", { name: "登录" }));

    const allBtns = screen.getAllByRole("button");
    const submitBtn = allBtns.find((b) => b.getAttribute("type") === "submit")!;
    expect(submitBtn.className).toContain("disabled:bg-indigo-300");
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "true");
  });
});
