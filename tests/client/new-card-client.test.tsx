import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewCardClient } from "../../app/admin/cards/new/new-client";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("<NewCardClient />", () => {
  beforeEach(() => {
    mockPush.mockReset();
    vi.unstubAllGlobals();
  });

  it("生成期间显示请求数量并锁定表单", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<NewCardClient />);

    const countInput = screen.getByRole("spinbutton", { name: "生成数量" });
    await user.clear(countInput);
    await user.type(countInput, "120");
    await user.click(screen.getByRole("button", { name: "生成" }));

    expect(screen.getByText(/正在生成并写入 120 张卡密/)).toBeInTheDocument();
    expect(countInput).toBeDisabled();
    expect(screen.getByRole("button", { name: "取消" })).toBeDisabled();
  });

  it("实际创建数少于请求数时显示部分成功提示", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          requestedCount: 10,
          cards: [
            { code: "23456789ABCDEFGH" },
            { code: "23456789ABCDEFGJ" },
          ],
        }),
      })
    );
    render(<NewCardClient />);

    await user.click(screen.getByRole("button", { name: "生成" }));

    expect(await screen.findByText("已生成 2 / 10 张卡密")).toBeInTheDocument();
    expect(screen.getByText(/发生并发冲突/)).toBeInTheDocument();
  });
});
