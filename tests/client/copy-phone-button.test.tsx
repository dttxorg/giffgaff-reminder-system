import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CopyPhoneButton } from "../../app/me/_components/copy-phone-button";

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

describe("<CopyPhoneButton />", () => {
  it("渲染初始 '复制完整号码'", () => {
    render(<CopyPhoneButton phone="07724215611" />);
    expect(
      screen.getByRole("button", { name: /复制完整手机号/ })
    ).toBeInTheDocument();
    expect(screen.getByText("复制完整号码")).toBeInTheDocument();
  });

  it("aria-label 包含完整手机号(屏幕阅读器友好)", () => {
    render(<CopyPhoneButton phone="07724215611" />);
    expect(
      screen.getByRole("button", { name: "复制完整手机号 07724215611" })
    ).toBeInTheDocument();
  });

  it("click → clipboard.writeText(phone) + 文字变 '已复制'", async () => {
    render(<CopyPhoneButton phone="07724215611" />);
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockWriteText).toHaveBeenCalledWith("07724215611");
    expect(screen.getByText("已复制")).toBeInTheDocument();
  });

  it("clipboard 拒绝 + execCommand 成功 → 也显示已复制", async () => {
    mockWriteText.mockRejectedValueOnce(new Error("denied"));
    render(<CopyPhoneButton phone="FALLBACK" />);
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("已复制")).toBeInTheDocument();
  });
});
