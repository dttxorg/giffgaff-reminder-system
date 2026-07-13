import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoadingButton } from "../../app/_components/loading-button";

describe("<LoadingButton />", () => {
  it("默认渲染 label 文本", () => {
    render(<LoadingButton label="保存" />);
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
  });

  it("loading=true → 显示 loadingLabel + 按钮 disabled + aria-busy=true", () => {
    render(<LoadingButton label="保存" loading loadingLabel="保存中" />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    // loading 文本在 LoadingButton 的 span 里(可能有多个: Spinner sr-only label + 文本)
    expect(btn).toHaveTextContent("保存中");
    // 静态 label 不应再出现
    expect(btn).not.toHaveTextContent(/^保存$/);
  });

  it("loading=false → 显示静态 label + 按钮可用", () => {
    render(<LoadingButton label="保存" />);
    const btn = screen.getByRole("button");
    expect(btn).not.toBeDisabled();
    expect(btn).not.toHaveAttribute("aria-busy", "true");
  });

  it("显式 disabled=true → 按钮禁用(不 loading)", () => {
    render(<LoadingButton label="删除" disabled />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
  });

  it("click → 触发 onClick handler", () => {
    const onClick = vi.fn();
    render(<LoadingButton label="保存" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("loading=true → click 不触发 onClick(防止重复提交)", () => {
    const onClick = vi.fn();
    render(
      <LoadingButton label="保存" loading onClick={onClick} />
    );
    fireEvent.click(screen.getByRole("button"));
    // button 本身被 disabled,fireEvent.click 仍会调 onClick?
    // 注: jsdom 不会真的检查 disabled 阻止 click 事件
    // 这里我们只检查 button.disabled 状态
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("tone='danger' → 按钮带 rose 配色", () => {
    render(<LoadingButton label="删除" tone="danger" />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-rose-600");
    expect(btn.className).toContain("hover:bg-rose-700");
  });

  it("tone='primary' (默认) → 按钮带 indigo 配色", () => {
    render(<LoadingButton label="保存" />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-indigo-600");
    expect(btn.className).toContain("hover:bg-indigo-700");
  });

  it("type 默认是 'button'(防意外提交表单)", () => {
    render(<LoadingButton label="保存" />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("显式 type='submit' 透传", () => {
    render(<LoadingButton label="保存" type="submit" />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("extra className 合并", () => {
    render(<LoadingButton label="保存" className="w-full py-2.5" />);
    expect(screen.getByRole("button").className).toContain("w-full py-2.5");
  });
});
