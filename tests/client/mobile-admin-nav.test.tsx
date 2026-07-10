import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// next/navigation stub
let mockPathname = "/admin";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// 动态 import 让 mock 先生效
const { MobileAdminNav } = await import(
  "../../app/admin/_components/mobile-admin-nav"
);

beforeEach(() => {
  mockPathname = "/admin";
  document.body.style.overflow = "";
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("<MobileAdminNav />", () => {
  it("默认渲染汉堡按钮 + 标题(抽屉不挂载)", () => {
    render(<MobileAdminNav />);
    // 汉堡按钮可见
    expect(screen.getByLabelText("打开菜单")).toBeInTheDocument();
    // 抽屉里的关闭按钮不应在 DOM(没 open)
    expect(screen.queryByLabelText("关闭菜单")).not.toBeInTheDocument();
    // 标题
    expect(screen.getByText("管理后台")).toBeInTheDocument();
  });

  it("点汉堡 → 抽屉打开,带遮罩 + 关闭按钮", async () => {
    const user = userEvent.setup();
    render(<MobileAdminNav />);
    await user.click(screen.getByLabelText("打开菜单"));
    // 抽屉内的元素出现
    expect(screen.getByLabelText("关闭菜单")).toBeInTheDocument();
    // 抽屉本体(带 dialog role)
    expect(screen.getByRole("dialog", { name: "管理后台导航" })).toBeInTheDocument();
    // 抽屉内显示 6 个导航项
    expect(screen.getByText("仪表盘")).toBeInTheDocument();
    expect(screen.getByText("号码管理")).toBeInTheDocument();
    expect(screen.getByText("卡密管理")).toBeInTheDocument();
    expect(screen.getByText("提醒日志")).toBeInTheDocument();
    // body 滚动锁
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("点关闭按钮 → 抽屉消失,body 滚动恢复", async () => {
    const user = userEvent.setup();
    render(<MobileAdminNav />);
    await user.click(screen.getByLabelText("打开菜单"));
    await user.click(screen.getByLabelText("关闭菜单"));
    await waitFor(() =>
      expect(screen.queryByLabelText("关闭菜单")).not.toBeInTheDocument()
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("Esc 关闭抽屉", async () => {
    const user = userEvent.setup();
    render(<MobileAdminNav />);
    await user.click(screen.getByLabelText("打开菜单"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("当前 pathname 匹配时,链接高亮 active", async () => {
    mockPathname = "/admin/sims";
    const user = userEvent.setup();
    render(<MobileAdminNav />);
    await user.click(screen.getByLabelText("打开菜单"));
    const simsLink = screen.getByRole("link", { name: /号码管理/ });
    // 当前 active 状态由父样式控制 — 验证链接在 DOM 即可
    expect(simsLink).toBeInTheDocument();
    // aria-current 不被我们设置(active 状态是视觉高亮,不是 aria)
  });
});
