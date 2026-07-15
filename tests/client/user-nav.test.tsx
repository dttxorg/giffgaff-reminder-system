import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserNav } from "../../app/_components/user-nav";

const { mockPush, mockRefresh, navState } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  navState: { pathname: "/" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => navState.pathname,
}));

describe("<UserNav />", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    navState.pathname = "/";
  });

  it("首屏静态显示登录入口", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<UserNav />);
    expect(screen.getByRole("link", { name: "登录" })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("轻量 session 接口确认后显示用户中心与退出", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ authenticated: true }),
      })
    );
    render(<UserNav />);

    expect(await screen.findByRole("link", { name: "用户中心" })).toHaveAttribute(
      "href",
      "/me"
    );
    expect(screen.getByRole("button", { name: "退出" })).toBeInTheDocument();
  });

  it("服务端已保护的 /me 路径不重复请求 session", () => {
    navState.pathname = "/me";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<UserNav />);

    expect(screen.getByRole("link", { name: "用户中心" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
