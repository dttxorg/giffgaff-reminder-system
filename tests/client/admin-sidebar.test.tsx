import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminSidebar } from "../../app/admin/_components/admin-sidebar";

const mockPrefetch = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ prefetch: mockPrefetch }),
}));

describe("<AdminSidebar />", () => {
  beforeEach(() => {
    mockPrefetch.mockReset();
  });

  it("不在挂载时批量预取,悬停或聚焦后才预取目标", async () => {
    const user = userEvent.setup();
    render(<AdminSidebar />);

    expect(mockPrefetch).not.toHaveBeenCalled();
    const simsLink = screen.getByRole("link", { name: /号码管理/ });
    await user.hover(simsLink);
    expect(mockPrefetch).toHaveBeenCalledWith("/admin/sims");

    const cardsLink = screen.getByRole("link", { name: /卡密管理/ });
    cardsLink.focus();
    expect(mockPrefetch).toHaveBeenCalledWith("/admin/cards");
  });

  it("当前页链接不重复预取", async () => {
    const user = userEvent.setup();
    render(<AdminSidebar />);

    await user.hover(screen.getByRole("link", { name: /仪表盘/ }));
    expect(mockPrefetch).not.toHaveBeenCalled();
  });
});
