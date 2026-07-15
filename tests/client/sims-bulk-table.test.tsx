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

/**
 * 危险操作现在走 ConfirmModal:
 * 点列表/工具栏的"删除"按钮 → 弹 Modal → 在 Modal 内点"删除 N 个"才调 fetch
 */
async function clickListDeleteThenConfirmInModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "删除" }));
  // Modal 内"删除 2 个"按钮
  await user.click(await screen.findByRole("button", { name: /删除 \d+ 个/ }));
}

describe("<SimsBulkTable />", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("渲染 sim 行 + 表头 checkbox", () => {
    render(<SimsBulkTable sims={sampleSims} />);
    expect(screen.getByText("07724215611")).toBeInTheDocument();
    expect(screen.getByText("07724215612")).toBeInTheDocument();
    expect(screen.getByLabelText("全选当前页")).toBeInTheDocument();
    // 没选中时,批量操作工具栏不显示
    expect(screen.queryByText(/已选/)).not.toBeInTheDocument();
  });

  it("勾单个 checkbox → 显示已选 + 工具栏", async () => {
    const user = userEvent.setup();
    render(<SimsBulkTable sims={sampleSims} />);
    await user.click(screen.getByLabelText("选择 sim 1"));
    expect(
      screen.getByText((_, el) => el?.textContent === "已选 1 个")
    ).toBeInTheDocument();
  });

  it("移动端隐藏列的表头与数据单元格保持一一对应", () => {
    const { container } = render(<SimsBulkTable sims={sampleSims} />);
    const hiddenHeaders = container.querySelectorAll("thead th.hidden.md\\:table-cell");
    const firstRowHiddenCells = container.querySelectorAll(
      "tbody tr:first-child td.hidden.md\\:table-cell"
    );

    expect(hiddenHeaders).toHaveLength(6);
    expect(firstRowHiddenCells).toHaveLength(6);
  });

  it("直接批量激活时显示具体动作进度", async () => {
    const user = userEvent.setup();
    let resolveRequest: ((value: unknown) => void) | undefined;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    render(<SimsBulkTable sims={sampleSims} />);
    await user.click(screen.getByLabelText("选择 sim 1"));
    await user.click(screen.getByRole("button", { name: "激活" }));

    expect(screen.getByRole("button", { name: "激活中…" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("正在激活 1 个号码");

    resolveRequest?.({
      ok: true,
      json: async () => ({ ok: true, affected: 1 }),
    });
    expect(await screen.findByText("已激活 1 个号码")).toBeInTheDocument();
  });

  it("全选 + 批量删除 → 弹 ConfirmModal → 确认后调 batch + 显示 success", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, affected: 2 }),
    });

    render(<SimsBulkTable sims={sampleSims} />);
    await user.click(screen.getByLabelText("全选当前页"));
    expect(
      screen.getByText((_, el) => el?.textContent === "已选 2 个")
    ).toBeInTheDocument();
    // 点"删除" → 弹 Modal(此时 fetch 还没被调)
    await clickListDeleteThenConfirmInModal(user);
    // Modal 确认后 → fetch 调 batch API
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/sims/batch",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"action":"delete"'),
        })
      )
    );
    expect(await screen.findByText(/已删除 2 个号码/)).toBeInTheDocument();
  });

  it("Modal 取消时 fetch 不调", async () => {
    const user = userEvent.setup();
    render(<SimsBulkTable sims={sampleSims} />);
    await user.click(screen.getByLabelText("全选当前页"));
    // 点"删除"弹 Modal
    await user.click(screen.getByRole("button", { name: "删除" }));
    // 点 Modal 里的"取消"
    await user.click(await screen.findByRole("button", { name: "取消" }));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
