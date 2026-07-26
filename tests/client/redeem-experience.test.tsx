import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RedeemExperience } from "../../app/redeem/redeem-experience";
import { UserNav } from "../../app/_components/user-nav";
import { clearClientSessionCache } from "../../lib/client-session";

const { mockPush, mockRefresh } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => "/redeem",
}));

describe("<RedeemExperience />", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    clearClientSessionCache();
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

  it("已登录用户可切换到宽屏批量导入流程", async () => {
    const user = userEvent.setup();
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

    await screen.findByRole("heading", { name: "绑定新的 SIM 卡" });
    await user.click(screen.getByRole("tab", { name: "批量导入" }));

    expect(
      screen.getByRole("heading", { name: "批量绑定 SIM 卡" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "批量数据" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("兑换进度:第 1 步 / 共 3 步")
    ).toHaveTextContent("导入数据");
  });

  it("与顶部导航合并为一次详细 Session 请求", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        authenticated: true,
        username: "alice",
        simCount: 3,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <>
        <UserNav />
        <RedeemExperience />
      </>
    );

    expect(
      await screen.findByRole("heading", { name: "绑定新的 SIM 卡" })
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/session?details=redeem",
      { cache: "no-store" }
    );
  });
});
