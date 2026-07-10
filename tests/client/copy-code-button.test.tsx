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
    expect(screen.getByRole("button").textContent).toContain("已复制");
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
    expect(screen.getByRole("button").textContent).toContain("已复制");
  });

  it("aria-label 包含卡密", () => {
    render(<CopyCodeButton code="ABCD-1234" />);
    expect(
      screen.getByRole("button", { name: "复制卡密 ABCD-1234" })
    ).toBeInTheDocument();
  });
});

describe("<CopyCodeButton /> 边缘", () => {
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

  it("超长卡密也能正常复制", () => {
    const long = "ABCD-1234-EFGH-5678-AAAA-BBBB-CCCC-DDDD-EEEE";
    render(<CopyCodeButton code={long} />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockWriteText).toHaveBeenCalledWith(long);
  });

  it("含特殊字符(横线、空格)也正常", () => {
    const code = "AB-CD 12_34";
    render(<CopyCodeButton code={code} />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockWriteText).toHaveBeenCalledWith(code);
  });

  it("clipboard + execCommand 都失败 → 不显示已复制,按钮文字保持", async () => {
    mockWriteText.mockRejectedValueOnce(new Error("denied"));
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(false), // execCommand 也失败
    });
    render(<CopyCodeButton code="WILL-FAIL" />);
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    // 复制失败,按钮文字保持"复制"(不是"✓ 已复制")
    const btn = screen.getByRole("button");
    expect(btn.textContent).toBe("复制");
    expect(btn.textContent).not.toContain("已复制");
  });
});
