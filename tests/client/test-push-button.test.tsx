import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { TestPushButton } from "../../app/admin/sims/_components/test-push-button";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("<TestPushButton />", () => {
  it("已绑定 sim → 渲染 '测试推送' 按钮", () => {
    render(<TestPushButton simId={42} isBound={true} />);
    expect(screen.getByRole("button", { name: /测试推送/ })).toBeInTheDocument();
  });

  it("未绑定 sim → 渲染 '未绑定,无法测试推送' 提示 + 无按钮", () => {
    render(<TestPushButton simId={42} isBound={false} />);
    expect(
      screen.getByText("未绑定,无法测试推送")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /测试推送/ })).toBeNull();
  });

  it("点击按钮 → 打开 ConfirmModal", () => {
    render(<TestPushButton simId={42} isBound={true} />);
    fireEvent.click(screen.getByRole("button", { name: /测试推送/ }));
    expect(screen.getByText("发送测试推送?")).toBeInTheDocument();
    expect(
      screen.getByText(/该 sim 绑定的用户会立刻收到一条测试消息/)
    ).toBeInTheDocument();
  });

  it("确认 → fetch POST /api/admin/sims/test-push with simIds=[id]", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        results: [{ simId: 42, ok: true }],
      }),
    } as Response);

    render(<TestPushButton simId={42} isBound={true} />);
    fireEvent.click(screen.getByRole("button", { name: /测试推送/ }));
    // modal 里有"发送测试推送" 按钮
    const confirmBtns = screen.getAllByRole("button", { name: /发送测试推送/ });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/sims/test-push",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ simIds: [42] }),
        })
      );
    });
  });

  it("推送成功 → 显示绿色 ✓ 消息", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        results: [{ simId: 42, ok: true }],
      }),
    } as Response);

    render(<TestPushButton simId={42} isBound={true} />);
    fireEvent.click(screen.getByRole("button", { name: /测试推送/ }));
    const confirmBtns = screen.getAllByRole("button", { name: /发送测试推送/ });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => {
      expect(
        screen.getByText(/推送成功,用户已收到测试消息/)
      ).toBeInTheDocument();
    });
  });

  it("推送失败(results[0].ok=false) → 显示红色错误 + errorMessage", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        results: [
          { simId: 42, ok: false, error: "SendKey 无效" },
        ],
      }),
    } as Response);

    render(<TestPushButton simId={42} isBound={true} />);
    fireEvent.click(screen.getByRole("button", { name: /测试推送/ }));
    const confirmBtns = screen.getAllByRole("button", { name: /发送测试推送/ });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/推送失败:SendKey 无效/)).toBeInTheDocument();
    });
  });

  it("API 整体 ok=false → 显示 fallback error", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: "未找到这些 sim" }),
    } as Response);

    render(<TestPushButton simId={42} isBound={true} />);
    fireEvent.click(screen.getByRole("button", { name: /测试推送/ }));
    const confirmBtns = screen.getAllByRole("button", { name: /发送测试推送/ });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/推送失败:未找到这些 sim/)).toBeInTheDocument();
    });
  });

  it("fetch 抛错 → 显示 '网络错误' fallback", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error("网络断了"));

    render(<TestPushButton simId={42} isBound={true} />);
    fireEvent.click(screen.getByRole("button", { name: /测试推送/ }));
    const confirmBtns = screen.getAllByRole("button", { name: /发送测试推送/ });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/推送失败:网络断了/)).toBeInTheDocument();
    });
  });
});
