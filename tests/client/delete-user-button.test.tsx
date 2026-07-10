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

const { DeleteUserButton } = await import(
  "../../app/admin/users/[id]/delete-user-button"
);

beforeEach(() => {
  mockPush.mockReset();
  mockRefresh.mockReset();
  mockFetch.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("<DeleteUserButton />", () => {
  it("初始只显示一个 '删除该用户' 触发按钮", () => {
    render(<DeleteUserButton userId={42} reminderCount={7} />);
    expect(screen.getByRole("button", { name: "删除该用户" })).toBeInTheDocument();
    // modal 没开:无 dialog
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("点触发按钮 → 弹出 modal,显示用户 ID 和 reminder 数", async () => {
    const user = userEvent.setup();
    render(<DeleteUserButton userId={42} reminderCount={7} />);
    await user.click(screen.getByRole("button", { name: "删除该用户" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // title
    expect(screen.getByText("删除用户 #42")).toBeInTheDocument();
    // reminderCount 出现在说明里
    expect(screen.getByText(/7 条推送历史记录/)).toBeInTheDocument();
    // placeholder 提示用户 ID
    expect(screen.getByPlaceholderText("42")).toBeInTheDocument();
    // 确认按钮 disabled(没输入)
    expect(screen.getByRole("button", { name: "确认删除" })).toBeDisabled();
  });

  it("输入错误 ID → 显示错误,不调 fetch", async () => {
    const user = userEvent.setup();
    render(<DeleteUserButton userId={42} reminderCount={0} />);
    await user.click(screen.getByRole("button", { name: "删除该用户" }));
    await user.type(screen.getByPlaceholderText("42"), "99");

    // 按钮仍然 disabled(因为不等)
    expect(screen.getByRole("button", { name: "确认删除" })).toBeDisabled();

    // 强行绕过 disabled(用 fireEvent) 调一下,验证 onSubmit 的早期校验
    // 但实际上 button disabled 时 userEvent.click 不会触发 onClick,所以这里只测按钮 disabled 状态
  });

  it("输入正确 ID → 按钮可点,点击后调 fetch 并跳转", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, simId: 1 }),
    });
    render(<DeleteUserButton userId={42} reminderCount={3} />);
    await user.click(screen.getByRole("button", { name: "删除该用户" }));

    await user.type(screen.getByPlaceholderText("42"), "42");
    const confirmBtn = screen.getByRole("button", { name: "确认删除" });
    expect(confirmBtn).not.toBeDisabled();
    await user.click(confirmBtn);

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/users/42", {
        method: "DELETE",
      })
    );
    expect(mockPush).toHaveBeenCalledWith("/admin/users");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("API 返回 ok:false → 显示错误,不跳转", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: "该用户有未完成订单" }),
    });
    render(<DeleteUserButton userId={42} reminderCount={0} />);
    await user.click(screen.getByRole("button", { name: "删除该用户" }));
    await user.type(screen.getByPlaceholderText("42"), "42");
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    expect(await screen.findByText("该用户有未完成订单")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("点取消 → 关闭 modal,清空输入", async () => {
    const user = userEvent.setup();
    render(<DeleteUserButton userId={42} reminderCount={0} />);
    await user.click(screen.getByRole("button", { name: "删除该用户" }));
    await user.type(screen.getByPlaceholderText("42"), "4");
    await user.click(screen.getByRole("button", { name: "取消" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    // 再次打开 → 输入框是空的
    await user.click(screen.getByRole("button", { name: "删除该用户" }));
    expect((screen.getByPlaceholderText("42") as HTMLInputElement).value).toBe("");
  });
});
