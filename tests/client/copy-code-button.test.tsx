import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { CopyCodeButton } from "../../app/admin/cards/_components/copy-code-button";

describe("<CopyCodeButton />", () => {
  let mockWriteText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockWriteText = vi.fn().mockResolvedValue(undefined);
    // jsdom 装 navigator.clipboard
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText: mockWriteText },
    });
    // jsdom 装 document.execCommand(fallback 路径用)
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(true),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("渲染初始为 '复制' 状态", () => {
    render(<CopyCodeButton code="ABCD-1234-EFGH-5678" />);
    const btn = screen.getByRole("button", { name: /复制卡密/ });
    expect(btn).toHaveTextContent("复制");
  });

  it("click → 调 clipboard.writeText(code) + 变 ✓ 已复制", async () => {
    render(<CopyCodeButton code="ABCD-1234-EFGH-5678" />);
    fireEvent.click(screen.getByRole("button"));
    // 等待 onClick 异步链(setCopied) flush
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockWriteText).toHaveBeenCalledWith("ABCD-1234-EFGH-5678");
    expect(screen.getByRole("button")).toHaveTextContent("✓ 已复制");
  });

  it("fireEvent click → 调 writeText", () => {
    // 用 fireEvent 而非 userEvent.click 避开 setup() 流程
    render(<CopyCodeButton code="ABCD-1234-EFGH-5678" />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockWriteText).toHaveBeenCalledWith("ABCD-1234-EFGH-5678");
  });

  it("clipboard 拒绝时 → fallback 到 textarea + execCommand", async () => {
    mockWriteText.mockRejectedValueOnce(new Error("denied"));
    const createSpy = vi.spyOn(document, "createElement");
    render(<CopyCodeButton code="FALLBACK-CODE" />);
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(createSpy).toHaveBeenCalledWith("textarea");
    expect(screen.getByRole("button")).toHaveTextContent("✓ 已复制");
  });

  it("aria-label 包含卡密", () => {
    render(<CopyCodeButton code="ABCD-1234" />);
    expect(
      screen.getByRole("button", { name: "复制卡密 ABCD-1234" })
    ).toBeInTheDocument();
  });
});
