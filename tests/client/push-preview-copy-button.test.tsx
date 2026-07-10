import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PushPreviewCopyButton } from "../../app/_components/push-preview-copy-button";

let mockWriteText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockWriteText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    writable: true,
    value: { writeText: mockWriteText },
  });
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(true),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("<PushPreviewCopyButton />", () => {
  it("渲染初始 '复制预览'", () => {
    render(<PushPreviewCopyButton body="测试推送内容" />);
    expect(
      screen.getByRole("button", { name: "复制推送预览" })
    ).toBeInTheDocument();
    expect(screen.getByText("复制预览")).toBeInTheDocument();
  });

  it("click → clipboard.writeText(body) + 文字变 '已复制'", async () => {
    render(<PushPreviewCopyButton body="实际推送内容" />);
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockWriteText).toHaveBeenCalledWith("实际推送内容");
    expect(screen.getByText("已复制")).toBeInTheDocument();
  });

  it("clipboard 拒绝 + execCommand 成功 → 也显示已复制", async () => {
    mockWriteText.mockRejectedValueOnce(new Error("denied"));
    render(<PushPreviewCopyButton body="fallback 内容" />);
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("已复制")).toBeInTheDocument();
  });
});
