import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CopyPortLinkButton } from "../../app/me/_components/copy-port-link-button";

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

describe("<CopyPortLinkButton />", () => {
  it("渲染 '复制保号链接'", () => {
    render(<CopyPortLinkButton portUrl="https://example.com/p/abc123" />);
    expect(
      screen.getByRole("button", { name: "复制保号链接" })
    ).toBeInTheDocument();
    expect(screen.getByText("复制保号链接")).toBeInTheDocument();
  });

  it("click → 调 clipboard.writeText(传完整 URL)", async () => {
    render(<CopyPortLinkButton portUrl="https://example.com/p/abc123" />);
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockWriteText).toHaveBeenCalledWith("https://example.com/p/abc123");
    expect(screen.getByText("已复制")).toBeInTheDocument();
  });

  it("clipboard 失败 → fallback textarea + execCommand", async () => {
    mockWriteText.mockRejectedValueOnce(new Error("denied"));
    render(<CopyPortLinkButton portUrl="https://example.com/p/fb" />);
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    // execCommand 成功(默认 mockReturnValue(true))→ 显示"已复制"
    expect(screen.getByText("已复制")).toBeInTheDocument();
  });
});


describe("<CopyPortLinkButton /> 移动端 a11y (round 154)", () => {
  it("按钮 className 包含 min-h-[44px] (移动端触摸目标 ≥44px)", () => {
    render(<CopyPortLinkButton portUrl="https://example.com/p/abc" />);
    const btn = screen.getByRole("button", { name: /复制保号链接/ });
    expect(btn.className).toContain("min-h-[44px]");
  });

  it("'已复制' 状态也保留 min-h-[44px]", async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText: mockWriteText },
    });

    render(<CopyPortLinkButton portUrl="https://example.com/p/abc" />);
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("min-h-[44px]");
  });
});
