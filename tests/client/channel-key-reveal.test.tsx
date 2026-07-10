import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChannelKeyReveal } from "../../app/me/_components/channel-key-reveal";

describe("<ChannelKeyReveal />", () => {
  it("默认显示前 12 位 + '****',无 '显示完整' 按钮(long key)", () => {
    render(
      <ChannelKeyReveal channelKey="SCT123456AB-this-is-the-long-secret-key" />
    );
    expect(
      screen.getByText("SCT123456AB-****")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "显示完整" })
    ).toBeInTheDocument();
    // 完整 key 不会出现在文档里
    expect(
      screen.queryByText("SCT123456AB-this-is-the-long-secret-key")
    ).not.toBeInTheDocument();
  });

  it("点击 '显示完整' → 显示完整 key,按钮变 '收回'", async () => {
    const user = userEvent.setup();
    render(
      <ChannelKeyReveal channelKey="SCT123456AB-this-is-the-long-secret-key" />
    );
    await user.click(screen.getByRole("button", { name: "显示完整" }));
    expect(
      screen.getByText("SCT123456AB-this-is-the-long-secret-key")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "收回" })
    ).toBeInTheDocument();
    // aria-pressed=true
    expect(
      screen.getByRole("button", { name: "收回" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("再点 '收回' → 回到 mask 状态", async () => {
    const user = userEvent.setup();
    render(
      <ChannelKeyReveal channelKey="SCT123456AB-this-is-the-long-secret-key" />
    );
    await user.click(screen.getByRole("button", { name: "显示完整" }));
    await user.click(screen.getByRole("button", { name: "收回" }));
    expect(
      screen.getByText("SCT123456AB-****")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("SCT123456AB-this-is-the-long-secret-key")
    ).not.toBeInTheDocument();
  });

  it("key 长度 ≤ 16(短,如 telegram chatId)→ 直接显示完整,无切换按钮", () => {
    render(<ChannelKeyReveal channelKey="1234567890" />);
    const codeEl = document.querySelector("code")!;
    expect(codeEl.textContent).toBe("1234567890");
    expect(
      screen.queryByRole("button", { name: "显示完整" })
    ).not.toBeInTheDocument();
  });

  it("key 长度 = 16(边界)→ 不显示按钮(因为 ≤ 16 走短 key 分支)", () => {
    render(<ChannelKeyReveal channelKey="abcdefghijklmnop" />);
    const codeEl = document.querySelector("code")!;
    expect(codeEl.textContent).toBe("abcdefghijklmnop");
    expect(
      screen.queryByRole("button", { name: "显示完整" })
    ).not.toBeInTheDocument();
  });

  it("key 长度 = 17(刚超边界)→ 显示 mask + 按钮", () => {
    render(<ChannelKeyReveal channelKey="abcdefghijklmnopq" />);
    // 17 字符:slice(0, 12) = "abcdefghijkl"
    expect(screen.getByText("abcdefghijkl****")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "显示完整" })
    ).toBeInTheDocument();
  });
});
