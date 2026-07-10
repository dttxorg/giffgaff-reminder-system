import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SimsBulkTable } from "../../app/admin/sims/_components/sims-bulk-table";

// next/navigation 的 useRouter 在测试里返回空操作 stub
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// fetch 全局 mock,让单个测试能改写 response
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// confirm 全局 mock,delete/test-push 路径会调
const mockConfirm = vi.fn(() => true);
vi.stubGlobal("confirm", mockConfirm);

const sampleSims = [
  {
    id: 1,
    phoneNumber: "07724215611",
    activatedAt: "2024-01-01",
    lastPortedAt: null,
    status: "active" as const,
    dayOffset: 200,
    inWindow: true,
    channel: "serverchan",
    lastSentAt: "2024-07-08 12:00:00",
    lastSentStatus: "success" as const,
  },
  {
    id: 2,
    phoneNumber: "07724215612",
    activatedAt: "2024-02-01",
    lastPortedAt: "2024-06-01",
    status: "paused" as const,
    dayOffset: 150,
    inWindow: false,
    channel: "bark",
    lastSentAt: null,
    lastSentStatus: null,
  },
];

describe("<SimsBulkTable />", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockConfirm.mockReset();
    mockConfirm.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("渲染 sim 行 + 表头 checkbox", () => {
    render(<SimsBulkTable sims={sampleSims} />);
    // 两条数据 → 看到两个手机号
    expect(screen.getByText("07724215611")).toBeInTheDocument();
    expect(screen.getByText("07724215612")).toBeInTheDocument();
    // 全选 checkbox 存在
    expect(screen.getByLabelText("全选当前页")).toBeInTheDocument();
    // 没选中时,批量操作工具栏不显示
    expect(screen.queryByText(/已选/)).not.toBeInTheDocument();
  });

  it("勾单个 checkbox → 显示已选 + 工具栏", async () => {
    const user = userEvent.setup();
    render(<SimsBulkTable sims={sampleSims} />);
    // 勾第一行
    const row1 = screen.getByLabelText("选择 sim 1");
    await user.click(row1);
    // 工具栏出现
    expect(
      screen.getByText((_, el) => el?.textContent === "已选 1 个")
    ).toBeInTheDocument();
  });

  it("点全选 + 批量删除 → fetch 调 batch + 显示 success 消息", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, affected: 2 }),
    });

    render(<SimsBulkTable sims={sampleSims} />);
    // 全选
    await user.click(screen.getByLabelText("全选当前页"));
    expect(
      screen.getByText((_, el) => el?.textContent === "已选 2 个")
    ).toBeInTheDocument();
    // 确认框 — 默认已设 true,直接走删除
    expect(mockConfirm).not.toHaveBeenCalled(); // 全选不弹 confirm
    // 点"删除"按钮
    await user.click(screen.getByRole("button", { name: "删除" }));
    // fetch 调 batch API
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/sims/batch",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"action":"delete"'),
        })
      )
    );
    // 成功消息出现
    expect(await screen.findByText(/已删除 2 个号码/)).toBeInTheDocument();
  });

  it("取消 confirm 时不发请求", async () => {
    const user = userEvent.setup();
    mockConfirm.mockReturnValueOnce(false);

    render(<SimsBulkTable sims={sampleSims} />);
    await user.click(screen.getByLabelText("全选当前页"));
    await user.click(screen.getByRole("button", { name: "删除" }));
    // fetch 不被调
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
