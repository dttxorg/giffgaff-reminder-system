import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BatchRedeemPanel } from "../../app/redeem/_components/batch-redeem-panel";

const CODE_A = "7K9P-3R4M-8H2X-N5YQ";
const CODE_B = "8W3R-K2NP-9X5T-M7QH";

describe("<BatchRedeemPanel />", () => {
  const onSingle = vi.fn();
  const onStepChange = vi.fn();

  beforeEach(() => {
    onSingle.mockReset();
    onStepChange.mockReset();
    vi.unstubAllGlobals();
  });

  it("未登录用户看到明确登录入口与单张兑换回退入口", () => {
    render(
      <BatchRedeemPanel
        sessionReady
        isLoggedIn={false}
        existingSimCount={0}
        onSingle={onSingle}
        onStepChange={onStepChange}
      />
    );

    expect(
      screen.getByRole("link", { name: "登录已有账号" })
    ).toHaveAttribute("href", "/login");
    expect(
      screen.getByRole("button", { name: "先兑换一张" })
    ).toBeInTheDocument();
  });

  it("移动端输入保持 16px 字号并在逐行错误修复前禁止提交", () => {
    render(
      <BatchRedeemPanel
        sessionReady
        isLoggedIn
        existingSimCount={2}
        onSingle={onSingle}
        onStepChange={onStepChange}
      />
    );

    const textarea = screen.getByRole("textbox", { name: "批量数据" });
    expect(textarea.className).toContain("text-base");
    fireEvent.change(textarea, {
      target: { value: "无效内容" },
    });

    expect(screen.getByText(/第 1 行/)).toHaveTextContent(
      "每行需要“兑换码、手机号、激活日期”三列"
    );
    expect(
      screen.getByRole("button", { name: "确认导入 0 张" })
    ).toBeDisabled();
  });

  it("提交有效批量数据并展示逐项成功和失败结果", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        total: 2,
        redeemed: 1,
        failed: 1,
        results: [
          { index: 0, ok: true, simId: 101 },
          { index: 1, ok: false, error: "卡密不存在" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <BatchRedeemPanel
        sessionReady
        isLoggedIn
        existingSimCount={3}
        onSingle={onSingle}
        onStepChange={onStepChange}
      />
    );

    fireEvent.change(screen.getByRole("textbox", { name: "批量数据" }), {
      target: {
        value: `${CODE_A},07724215611,2026-07-01\n${CODE_B},07724215612,2026-07-02`,
      },
    });
    expect(screen.getByText("可导入 2")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "确认导入 2 张" })
    );

    expect(
      await screen.findByRole("heading", { name: "批量兑换已处理" })
    ).toBeInTheDocument();
    expect(screen.getByText("卡密不存在")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看我的号码" })).toHaveAttribute(
      "href",
      "/me"
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/redeem/batch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              code: "7K9P3R4M8H2XN5YQ",
              phoneNumber: "07724215611",
              activatedAt: "2026-07-01",
              carrier: "giffgaff",
            },
            {
              code: "8W3RK2NP9X5TM7QH",
              phoneNumber: "07724215612",
              activatedAt: "2026-07-02",
              carrier: "giffgaff",
            },
          ],
        }),
      })
    );
    expect(onStepChange).toHaveBeenLastCalledWith(3);
  });
});
