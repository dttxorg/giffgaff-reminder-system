/**
 * /me/settings 选择 Sever酱 渠道时的内联引导
 *
 * - 选中 Sever酱 后,SendKey 输入框上方应出现 3 步指引
 * - 主链接是 https://sct.ftqq.com/
 * - 步骤 2 提到"登录"后找 SendKey
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const { MeSettingsClient } = await import("../../app/me/settings/settings-client");

beforeEach(() => {
  mockPush.mockReset();
  mockRefresh.mockReset();
  mockFetch.mockReset();
});

describe("<MeSettingsClient /> Sever酱 内联引导", () => {
  it("选中 Sever酱 → 显示 3 步指引,主链接指向 sct.ftqq.com", async () => {
    render(
      <MeSettingsClient
        initialChannel="serverchan"
        initialChannelKey=""
        isFirstTime={true}
        activatedAt="2026-01-01"
        simId={1}
      />
    );

    // Sever 酱默认就是 serverchan,指引应该已显示
    expect(screen.getByText(/3 步搞定/)).toBeInTheDocument();

    // 主链接 sct.ftqq.com(开新窗口,有外部图标)
    const homeLink = screen.getByRole("link", { name: /sct\.ftqq\.com/ });
    expect(homeLink).toHaveAttribute("href", "https://sct.ftqq.com/");
    expect(homeLink).toHaveAttribute("target", "_blank");

    // 步骤里提到"登录"和"复制"等关键动作
    expect(screen.getByText(/「登录」/)).toBeInTheDocument();
    expect(screen.getByText(/「复制」/)).toBeInTheDocument();

    // 提示 SendKey 以 SCT 开头
    expect(screen.getByText(/SCT/)).toBeInTheDocument();
  });

  it("没选 Sever酱 时不显示这个指引(切到 bark 后指引消失)", async () => {
    const user = userEvent.setup();
    render(
      <MeSettingsClient
        initialChannel="serverchan"
        initialChannelKey=""
        isFirstTime={true}
        activatedAt="2026-01-01"
        simId={1}
      />
    );
    // 切到 Bark
    await user.click(screen.getByRole("button", { name: /Bark/ }));
    // Sever酱 指引应该消失
    expect(screen.queryByText(/3 步搞定/)).not.toBeInTheDocument();
  });

  it("从 bark 切回 serverchan,指引又出现", async () => {
    const user = userEvent.setup();
    render(
      <MeSettingsClient
        initialChannel="bark"
        initialChannelKey="https://api.day.app/xxx"
        isFirstTime={false}
        activatedAt="2026-01-01"
        simId={1}
      />
    );
    // 默认 bark,没 Sever酱 指引
    expect(screen.queryByText(/3 步搞定/)).not.toBeInTheDocument();
    // 切到 Sever酱
    await user.click(screen.getByRole("button", { name: /Sever酱/ }));
    expect(screen.getByText(/3 步搞定/)).toBeInTheDocument();
  });
});
