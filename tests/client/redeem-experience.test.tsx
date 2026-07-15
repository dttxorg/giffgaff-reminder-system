import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RedeemExperience } from "../../app/redeem/redeem-experience";

const { mockPush, mockRefresh } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

describe("<RedeemExperience />", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  it("账号状态查询期间已可输入卡密", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<RedeemExperience />);

    expect(screen.getByRole("heading", { name: "兑换卡密" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX")).toBeEnabled();
  });

  it("确认已登录后切换为追加 SIM 卡语境", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: true,
          username: "alice",
          simCount: 3,
        }),
      })
    );
    render(<RedeemExperience />);

    expect(
      await screen.findByRole("heading", { name: "绑定新的 SIM 卡" })
    ).toBeInTheDocument();
  });
});
