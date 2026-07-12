import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResendButton } from "../../app/admin/reminders/_components/resend-button";

// next/navigation stub
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/**
 * 点 "重发" 按钮 → 弹 ConfirmModal → 在 Modal 里再点 "重发" 按钮才调 fetch
 * helper: 走到 Modal 确认那一步
 */
async function clickResendAndConfirm() {
  const user = userEvent.setup();
  // 第一步:点列表里的 "重发" 触发 ConfirmModal
  await user.click(screen.getByRole("button", { name: "重发" }));
  // 第二步:点 Modal 里的确认按钮。Modal 打开后会出现 2 个 "重发" 按钮(列表+Modal),
  // 取最后一个(Modal 内的)
  const btns = await screen.findAllByRole("button", { name: "重发" });
  await user.click(btns[btns.length - 1]);
}

describe("<ResendButton />", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("渲染 '重发' 按钮 + 初始未 loading", () => {
    render(<ResendButton reminderId={42} />);
    const btn = screen.getByRole("button", { name: "重发" });
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveTextContent("重发");
  });

  it("点 → ConfirmModal 弹框 → confirm=true 调 fetch + 成功后显示 已发送", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(<ResendButton reminderId={42} />);
    await clickResendAndConfirm();
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/reminders/42/resend",
        expect.objectContaining({ method: "POST" })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("已发送")).toBeInTheDocument()
    );
  });

  it("点 → ConfirmModal 取消 → 不发 fetch", async () => {
    const user = userEvent.setup();
    render(<ResendButton reminderId={42} />);
    // 点列表里的 "重发" 触发 Modal
    await user.click(screen.getByRole("button", { name: "重发" }));
    // 点 Modal 里的取消
    await user.click(await screen.findByRole("button", { name: "取消" }));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetch 失败 → 显示错误消息", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: "rate limited" }),
    });
    render(<ResendButton reminderId={42} />);
    await clickResendAndConfirm();
    await waitFor(() =>
      expect(screen.getByText("rate limited")).toBeInTheDocument()
    );
  });

  it("loading 中 Modal 确认按钮 disabled", async () => {
    // 永远不 resolve 的 fetch — 触发后 Modal 内确认按钮变 loading
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<ResendButton reminderId={42} />);
    await clickResendAndConfirm();
    // 点完确认后,Modal 内按钮文字变 "处理中..." 且 disabled
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      const modalBtn = dialog.querySelector("button.bg-indigo-600, button.bg-rose-600");
      expect(modalBtn?.textContent).toMatch(/处理中/);
      expect(modalBtn).toBeDisabled();
    });
  });
});

describe("<ResendButton /> 边缘", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("fetch 网络错误(throw)→ 显示 e.message", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    render(<ResendButton reminderId={42} />);
    await clickResendAndConfirm();
    await waitFor(() =>
      expect(screen.getByText("network down")).toBeInTheDocument()
    );
  });

  it("fetch throw 且 e 不是 Error → 显示 '网络错误' fallback", async () => {
    // ts-expect-error testing 字符串 throw
    mockFetch.mockRejectedValueOnce("字符串错误" as never);
    render(<ResendButton reminderId={42} />);
    await clickResendAndConfirm();
    await waitFor(() =>
      expect(screen.getByText("网络错误")).toBeInTheDocument()
    );
  });

  it("API 返回 ok=false 但无 error 字段 → fallback '重发失败'", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false }),
    });
    render(<ResendButton reminderId={42} />);
    await clickResendAndConfirm();
    await waitFor(() =>
      expect(screen.getByText("重发失败")).toBeInTheDocument()
    );
  });

  it("loading 中 → Modal 按钮文字变 '处理中...' 且 disabled", async () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {})); // 永远 pending
    render(<ResendButton reminderId={42} />);
    await clickResendAndConfirm();
    // Modal 内按钮文字变 "处理中..."
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      const modalBtn = dialog.querySelector("button.bg-indigo-600, button.bg-rose-600");
      expect(modalBtn?.textContent).toMatch(/处理中/);
    });
  });

  it("reminderId 为 99 → URL 正确", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(<ResendButton reminderId={99} />);
    await clickResendAndConfirm();
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/reminders/99/resend",
        expect.objectContaining({ method: "POST" })
      )
    );
  });
});