import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { ResendButton } from "../../app/admin/reminders/_components/resend-button";

// next/navigation stub
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
const mockConfirm = vi.fn(() => true);
vi.stubGlobal("confirm", mockConfirm);

describe("<ResendButton />", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockConfirm.mockReset();
    mockConfirm.mockReturnValue(true);
  });

  it("渲染 '重发' 按钮 + 初始未 loading", () => {
    render(<ResendButton reminderId={42} />);
    const btn = screen.getByRole("button", { name: "重发" });
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveTextContent("重发");
  });

  it("点 → confirm 弹框 + confirm=true 调 fetch + 成功后按钮变 已发送", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(<ResendButton reminderId={42} />);
    const btn = screen.getByRole("button", { name: "重发" });
    btn.click();
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/reminders/42/resend",
        expect.objectContaining({ method: "POST" })
      )
    );
    // router.refresh() 被调(success)
    // 成功消息在 sibling span,不在 button
    await waitFor(() =>
      expect(screen.getByText("已发送")).toBeInTheDocument()
    );
  });

  it("confirm 取消 → 不发 fetch", () => {
    mockConfirm.mockReturnValueOnce(false);
    render(<ResendButton reminderId={42} />);
    screen.getByRole("button", { name: "重发" }).click();
    expect(mockConfirm).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetch 失败 → 显示错误消息", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: "rate limited" }),
    });
    render(<ResendButton reminderId={42} />);
    screen.getByRole("button", { name: "重发" }).click();
    await waitFor(() =>
      expect(screen.getByText("rate limited")).toBeInTheDocument()
    );
  });

  it("loading 中按钮 disabled", async () => {
    // 永远不 resolve 的 fetch
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<ResendButton reminderId={42} />);
    screen.getByRole("button", { name: "重发" }).click();
    // 让 React flush
    await act(async () => {});
    // loading 时 button 文字变成 "发送中..." 并 disabled
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("发送中...");
  });
});

describe("<ResendButton /> 边缘", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockConfirm.mockReset();
    mockConfirm.mockReturnValue(true);
  });

  it("fetch 网络错误(throw)→ 显示 e.message;loading 结束按钮恢复", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    render(<ResendButton reminderId={42} />);
    screen.getByRole("button", { name: "重发" }).click();
    await waitFor(() =>
      expect(screen.getByText("network down")).toBeInTheDocument()
    );
    // loading 已结束,按钮恢复
    const btn = screen.getByRole("button", { name: "重发" });
    expect(btn).not.toBeDisabled();
  });

  it("fetch throw 且 e 不是 Error → 显示 '网络错误' fallback", async () => {
    // ts-expect-error testing 字符串 throw
    mockFetch.mockRejectedValueOnce("字符串错误" as never);
    render(<ResendButton reminderId={42} />);
    screen.getByRole("button", { name: "重发" }).click();
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
    screen.getByRole("button", { name: "重发" }).click();
    await waitFor(() =>
      expect(screen.getByText("重发失败")).toBeInTheDocument()
    );
  });

  it("loading 中 → button 文字变 '发送中...' 且 disabled", async () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {})); // 永远 pending
    render(<ResendButton reminderId={42} />);
    screen.getByRole("button", { name: "重发" }).click();
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /发送中/ });
      expect(btn).toBeDisabled();
      expect(btn).toHaveTextContent("发送中...");
    });
  });

  it("reminderId 为 99 → URL 正确", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(<ResendButton reminderId={99} />);
    screen.getByRole("button", { name: "重发" }).click();
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/reminders/99/resend",
        expect.objectContaining({ method: "POST" })
      )
    );
  });
});
