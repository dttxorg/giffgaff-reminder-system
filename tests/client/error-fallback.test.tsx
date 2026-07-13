import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorFallback } from "../../app/_components/error-fallback";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("<ErrorFallback />", () => {
  const fakeError = new Error("boom") as Error & { digest?: string };

  it("渲染默认 scope = '加载时' + 错误信息 + 两个 CTA", () => {
    render(<ErrorFallback error={fakeError} reset={() => {}} />);
    expect(screen.getByText("加载时出了点问题")).toBeInTheDocument();
    expect(
      screen.getByText(/系统遇到意外错误,刷新或返回首页重试/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回首页" })).toBeInTheDocument();
  });

  it("自定义 scope 替换默认 '加载时'", () => {
    render(
      <ErrorFallback
        error={fakeError}
        reset={() => {}}
        scope="管理后台"
      />
    );
    expect(screen.getByText("管理后台出了点问题")).toBeInTheDocument();
  });

  it("自定义 homeHref 改变返回链接的 href", () => {
    render(
      <ErrorFallback
        error={fakeError}
        reset={() => {}}
        homeHref="/me"
      />
    );
    const link = screen.getByRole("link", { name: "返回首页" });
    expect(link).toHaveAttribute("href", "/me");
  });

  it("重试按钮 → 调用 reset prop", () => {
    const reset = vi.fn();
    render(<ErrorFallback error={fakeError} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("有 error.digest → 显示错误 ID", () => {
    render(
      <ErrorFallback
        error={Object.assign(new Error("x"), { digest: "abc123" })}
        reset={() => {}}
      />
    );
    expect(screen.getByText(/错误 ID: abc123/)).toBeInTheDocument();
  });

  it("无 error.digest → 不显示错误 ID 行", () => {
    render(<ErrorFallback error={fakeError} reset={() => {}} />);
    expect(screen.queryByText(/错误 ID:/)).toBeNull();
  });

  it("挂载时打印 console.error(便于开发排查)", () => {
    render(
      <ErrorFallback
        error={fakeError}
        reset={() => {}}
        scope="管理后台"
      />
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("管理后台"),
      fakeError
    );
  });
});
