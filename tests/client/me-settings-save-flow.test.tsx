import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockFetch, mockPush, mockRefresh } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.stubGlobal("fetch", mockFetch);

const { MeSettingsClient } = await import(
  "../../app/me/settings/settings-client"
);

describe("<MeSettingsClient /> 渠道保存反馈", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockPush.mockReset();
    mockRefresh.mockReset();
  });

  it("未修改时显示已保存并禁用重复提交", () => {
    render(
      <MeSettingsClient
        initialChannel="serverchan"
        initialChannelKey="SCT-existing-key"
        isFirstTime={false}
        activatedAt="2026-01-01"
        simId={23}
      />
    );

    expect(screen.getByRole("button", { name: "已保存" })).toBeDisabled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("修改后再恢复已保存配置时无需重复验证", async () => {
    const user = userEvent.setup();
    render(
      <MeSettingsClient
        initialChannel="serverchan"
        initialChannelKey="SCT-existing-key"
        isFirstTime={false}
        activatedAt="2026-01-01"
        simId={23}
      />
    );

    await user.click(screen.getByRole("button", { name: /Bark/ }));
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /Sever酱/ }));

    expect(screen.getByRole("button", { name: "已保存" })).toBeDisabled();
    expect(screen.getByText("渠道已验证")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("保存后原地确认生效，不等待或跳转", async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, simId: 23 }),
      });

    render(
      <MeSettingsClient
        initialChannel="serverchan"
        initialChannelKey="SCT-old-key"
        isFirstTime={false}
        activatedAt="2026-01-01"
        simId={23}
      />
    );

    const keyInput = screen.getByPlaceholderText("SCT2xxxxxxxx");
    await user.clear(keyInput);
    await user.type(keyInput, "SCT-new-key");
    await user.click(screen.getByRole("button", { name: "测试推送" }));
    expect(await screen.findByText(/已发送/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "保存" }));

    const successMessage = await screen.findByText(
      "已保存，设置已立即生效"
    );
    expect(successMessage).toHaveAttribute("role", "status");
    expect(screen.getByRole("button", { name: "已保存" })).toBeDisabled();
    expect(mockFetch).toHaveBeenLastCalledWith(
      "/api/me/channel",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
