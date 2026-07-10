import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "../../app/_components/password-input";

describe("<PasswordInput />", () => {
  it("默认 type=password(密码隐藏)", () => {
    render(<PasswordInput value="" onChange={() => {}} />);
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("点眼睛按钮 → 切到 type=text(显示密码)", async () => {
    const user = userEvent.setup();
    render(<PasswordInput value="secret" onChange={() => {}} />);
    const toggleBtn = screen.getByRole("button", { name: /显示密码/ });
    await user.click(toggleBtn);
    const textInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(textInput).toBeInTheDocument();
    expect(textInput).toHaveValue("secret");
  });

  it("再点 → 切回 password(隐藏)", async () => {
    const user = userEvent.setup();
    render(<PasswordInput value="secret" onChange={() => {}} />);
    const toggleBtn = screen.getByRole("button");
    // 第一次:显示
    await user.click(toggleBtn);
    // aria-label 现在是"隐藏密码"
    expect(screen.getByRole("button", { name: /隐藏密码/ })).toBeInTheDocument();
    // 第二次:隐藏
    await user.click(toggleBtn);
    expect(screen.getByRole("button", { name: /显示密码/ })).toBeInTheDocument();
  });

  it("aria-pressed 反映切换状态", async () => {
    const user = userEvent.setup();
    render(<PasswordInput value="" onChange={() => {}} />);
    const btn = screen.getByRole("button", { name: /显示密码/ });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("用户输入 → input value 同步更新 (controlled 行为)", async () => {
    // 受控输入测试:controlled input 行为 — 父组件用 onChange 更新 value prop
    const ControlledWrapper = () => {
      const [v, setV] = useState("");
      return <PasswordInput value={v} onChange={setV} />;
    };
    const user = userEvent.setup();
    render(<ControlledWrapper />);
    const input = document.querySelector("input") as HTMLInputElement;
    await user.type(input, "hello");
    // 父组件接收到 5 次 onChange 累积到 "hello"
    expect(input).toHaveValue("hello");
  });

  it("value prop 正确显示在 input", () => {
    render(<PasswordInput value="mySecret123" onChange={() => {}} />);
    const input = document.querySelector("input") as HTMLInputElement;
    expect(input).toHaveValue("mySecret123");
  });

  it("required prop 传递到底层 input", () => {
    render(<PasswordInput value="" onChange={() => {}} required />);
    const input = document.querySelector("input") as HTMLInputElement;
    expect(input).toBeRequired();
  });

  it("invalid prop 时 input 边框带 rose 色(视觉验证 class)", () => {
    const { container } = render(
      <PasswordInput value="ab" onChange={() => {}} invalid={true} />
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.className).toContain("border-rose-300");
    // invalid=false 时用 slate-300
  });
});
